from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from queue import Queue
import logging
import time
import os
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import random
import re
import html

class WebCrawler:
    def __init__(self):
        self.visited_urls = set()
        self.lock = threading.Lock()
        self.html_data = []
        self.code_data = []
        
    def crawl(self, start_url, max_depth=3, max_threads=20, max_pages=float('inf')):
        """Crawl a website starting from the given URL with no page limit"""
        url_queue = Queue()
        processed_urls = set()
        url_queue.put((start_url, 1))  # (url, depth)
        
        # Extract domain for staying within site
        parsed_url = urlparse(start_url)
        base_domain = parsed_url.netloc
        domain_prefix = f"{parsed_url.scheme}://{parsed_url.netloc}"
        
        # Create output directories
        domain_safe = base_domain.replace('.', '_')
        html_dir = f"data/html/{domain_safe}_html.jsonl"
        text_dir = f"data/text/{domain_safe}_text.jsonl"
        code_dir = f"data/code/{domain_safe}"
        
        os.makedirs(os.path.dirname(html_dir), exist_ok=True)
        os.makedirs(os.path.dirname(text_dir), exist_ok=True)
        os.makedirs(code_dir, exist_ok=True)
        
        # Open HTML file for writing
        with open(html_dir, 'w', encoding='utf-8') as html_file:
            pass  # Create/clear the file
            
        logging.info(f"Starting crawl of {start_url} with max depth {max_depth}, threads: {max_threads}")
        
        def process_url(url, depth):
            """Process a single URL"""
            if url in processed_urls:
                return None
                
            # Mark URL as processed
            with self.lock:
                processed_urls.add(url)
                
            try:
                # Get page content
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                }
                
                # Add timeout to prevent hanging
                response = requests.get(url, headers=headers, timeout=30)
                if response.status_code != 200:
                    logging.warning(f"Failed to retrieve {url}: Status {response.status_code}")
                    return None
                    
                html_content = response.text
                
                # Parse HTML
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # Save HTML content
                html_data = {
                    'url': url,
                    'text': html_content,
                    'status': True,
                    'host_url': domain_prefix  # Add host_url for consistency
                }
                
                with self.lock:
                    with open(html_dir, 'a', encoding='utf-8') as html_file:
                        html_file.write(json.dumps(html_data, ensure_ascii=False) + "\n")
                    logging.info(f"Saved HTML for {url}")
                
                # Extract code blocks with improved formatting
                code_blocks = self.extract_code_blocks(soup, url, code_dir)
                if code_blocks:
                    with self.lock:
                        self.code_data.extend(code_blocks)
                
                # If not at max depth, find and queue new URLs
                if depth < max_depth:
                    links = soup.find_all('a', href=True)
                    
                    new_urls = 0
                    for link in links:
                        href = link['href']
                        
                        # Skip fragments, javascript, and mailto links
                        if href.startswith('#') or href.startswith('javascript:') or href.startswith('mailto:'):
                            continue
                            
                        # Convert to absolute URL
                        next_url = urljoin(url, href)
                        
                        # Remove fragment
                        next_url = next_url.split('#')[0]
                        
                        # Only follow links to the same domain
                        if next_url.startswith(domain_prefix) and next_url not in processed_urls:
                            with self.lock:
                                url_queue.put((next_url, depth + 1))
                                new_urls += 1
                                
                                # No max pages limit check
                    
                    if new_urls > 0:
                        logging.info(f"Added {new_urls} new URLs from {url} (depth {depth})")
                
                return html_data
                
            except Exception as e:
                logging.warning(f"Error processing {url}: {str(e)}")
                return None
        
        # Process the starting URL first to ensure it works
        first_result = process_url(start_url, 1)
        if not first_result:
            logging.error(f"Failed to process starting URL {start_url}")
            
        # Use thread pool to process remaining URLs
        with ThreadPoolExecutor(max_workers=max_threads) as executor:
            futures = []
            
            # Set a maximum execution time to prevent infinite running
            start_time = time.time()
            max_execution_time = 14400  # 4 hours to allow more time for complete crawling
            
            while (not url_queue.empty() or futures) and time.time() - start_time < max_execution_time:
                # Add new tasks to the thread pool
                while not url_queue.empty() and len(futures) < max_threads:
                    url, depth = url_queue.get()
                    if url not in processed_urls:
                        futures.append(executor.submit(process_url, url, depth))
                
                # Handle completed tasks
                completed = []
                for future in futures:
                    if future.done():
                        completed.append(future)
                
                for future in completed:
                    futures.remove(future)
                    try:
                        future.result()  # Get result to catch exceptions
                    except Exception as e:
                        logging.error(f"Thread error: {str(e)}")
                
                # Add a small delay if no tasks completed
                if not completed:
                    time.sleep(0.1)
                    
            # Handle timeout case
            if time.time() - start_time >= max_execution_time:
                logging.warning(f"Crawl of {start_url} timed out after {max_execution_time/60} minutes")
                
        # Extract text from HTML
        self.html_to_text(html_dir, text_dir)
        
        # Save code metadata
        if self.code_data:
            code_metadata_path = os.path.join(os.path.dirname(code_dir), f"{domain_safe}_code_metadata.jsonl")
            with open(code_metadata_path, 'w', encoding='utf-8') as f:
                for item in self.code_data:
                    f.write(json.dumps(item, ensure_ascii=False) + "\n")
        
        logging.info(f"Crawl complete: Processed {len(processed_urls)} URLs for {base_domain}")
        return processed_urls
    
    def extract_code_blocks(self, soup, url, code_dir):
        """Extract code blocks from HTML content with improved formatting"""
        code_blocks = []
        
        # Find all code blocks using multiple selectors to increase coverage
        code_elements = soup.find_all(['pre', 'code'], class_=lambda c: c and any(
            x in str(c).lower() for x in ['code', 'highlight', 'syntax', 'language-', 'hljs', 'prettyprint', 'CodeMirror']))
        
        # Track processed code to avoid duplicates
        processed_content = set()
        
        for i, element in enumerate(code_elements):
            # Skip empty or very short blocks
            code_text = self._preserve_code_formatting(element)
            if not code_text or len(code_text.strip()) < 15:
                continue
                
            # Use content hash to avoid duplicates
            content_hash = hash(code_text)
            if content_hash in processed_content:
                continue
                
            processed_content.add(content_hash)
            
            # Detect language
            language = self._detect_language(element)
            
            # Find a heading for context
            heading = None
            current = element
            while current and not heading:
                header = current.find_previous(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
                if header:
                    heading = header.get_text(strip=True)
                    break
                current = current.parent
            
            # Fallback for when no heading is found
            if not heading:
                # Try to find section title from nearby elements
                parent_div = element.find_parent(['div', 'section'])
                if parent_div and parent_div.get('class'):
                    for cls in parent_div.get('class'):
                        if 'section' in cls.lower() or 'example' in cls.lower():
                            heading_tag = parent_div.find(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
                            if heading_tag:
                                heading = heading_tag.get_text(strip=True)
                                break
            
            # Final fallback
            if not heading:
                heading = "Code Example"
            
            # Clean heading for filename
            safe_heading = re.sub(r'[^\w\s]', '', heading).strip()
            safe_heading = re.sub(r'\s+', '_', safe_heading)
            safe_heading = safe_heading or f"code_example_{i+1}"
            
            # Parse domain for folder structure
            parsed_url = urlparse(url)
            domain = parsed_url.netloc.replace('.', '_')
            
            # Path components for subfolder
            path = parsed_url.path.strip('/')
            if path:
                path_parts = path.split('/')
                subfolder = path_parts[0] if path_parts else "main"
            else:
                subfolder = "main"
            
            # Create directory
            save_dir = os.path.join(code_dir, subfolder)
            os.makedirs(save_dir, exist_ok=True)
            
            # Create filename
            count = 1
            base_filename = f"{safe_heading}.md"
            filename = base_filename
            
            while os.path.exists(os.path.join(save_dir, filename)):
                filename = f"{safe_heading}_{count}.md"
                count += 1
            
            # Save code to file
            file_path = os.path.join(save_dir, filename)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(f"{url}\n\n")
                f.write(f"```{language}\n")
                f.write(code_text)
                if not code_text.endswith('\n'):
                    f.write('\n')
                f.write("```\n")
            
            # Add to metadata
            code_blocks.append({
                'url': url,
                'file': file_path,
                'heading': heading,
                'language': language
            })
        
        return code_blocks
    
    def _preserve_code_formatting(self, element):
        """Extract code text while preserving proper code formatting"""
        # For <pre> tags, get text with line breaks preserved
        if element.name == 'pre':
            # First check if there's a nested code element
            code_element = element.find('code')
            if code_element:
                # Use the code element content
                content = code_element.get_text('\n', strip=False)
            else:
                # Use the pre element content
                content = element.get_text('\n', strip=False)
                
            # Clean up common HTML entity issues
            content = html.unescape(content)
            
            # Fix indentation by finding common leading whitespace
            lines = content.split('\n')
            if len(lines) > 1:
                # Find minimum indentation level
                min_indent = float('inf')
                for line in lines:
                    if line.strip():  # Skip empty lines
                        indent = len(line) - len(line.lstrip())
                        min_indent = min(min_indent, indent)
                
                # Remove common indentation if found
                if min_indent < float('inf'):
                    fixed_lines = []
                    for line in lines:
                        if line.strip():  # Only process non-empty lines
                            fixed_lines.append(line[min_indent:])
                        else:
                            fixed_lines.append(line)  # Preserve empty lines
                    content = '\n'.join(fixed_lines)
                
            return content
        
        # For <code> tags not inside <pre>
        elif element.name == 'code':
            content = element.get_text('\n', strip=False)
            return html.unescape(content)
        
        # Fallback - reconstruct content from element parts
        lines = []
        for child in element.contents:
            if isinstance(child, str):
                lines.append(child)
            elif child.name == 'br':
                lines.append('\n')
            else:
                lines.append(child.get_text())
                
        content = ''.join(lines)
        return html.unescape(content)
    
    def _detect_language(self, element):
        """Detect programming language from code element"""
        # Check element and parent classes for language hints
        for el in [element, element.parent]:
            if el and el.get('class'):
                for cls in el.get('class'):
                    if isinstance(cls, str):
                        # Common patterns for code highlighting libraries
                        if cls.startswith('language-'):
                            return cls.split('-')[1]
                        if 'language-' in cls:
                            parts = cls.split('language-')
                            if len(parts) > 1 and parts[1]:
                                return parts[1].split()[0]  # Get first word after language-
                        # Look for language name in class
                        for lang in ['python', 'javascript', 'js', 'java', 'cpp', 'csharp', 'ruby', 'go', 'php', 'html', 'css', 'sql', 'bash', 'shell']:
                            if lang in cls.lower():
                                return lang
        
        # Check content for language patterns
        code_text = element.get_text()
        
        # Python
        if re.search(r'def\s+\w+\s*\(.*\):', code_text) or \
           re.search(r'import\s+\w+', code_text) or \
           re.search(r'from\s+\w+\s+import', code_text):
            return 'python'
            
        # JavaScript
        if re.search(r'(const|let|var)\s+\w+\s*=', code_text) or \
           re.search(r'function\s+\w+\s*\(', code_text) or \
           re.search(r'=>', code_text):
            return 'javascript'
            
        # HTML
        if re.search(r'<\w+>.*</\w+>', code_text) or \
           re.search(r'<(div|span|p|a|img)[^>]*>', code_text):
            return 'html'
            
        # CSS
        if re.search(r'[\.\#]\w+\s*\{[^}]*\}', code_text) or \
           re.search(r'@media', code_text):
            return 'css'
            
        # SQL
        if re.search(r'SELECT|INSERT|UPDATE|DELETE|CREATE TABLE', code_text, re.IGNORECASE):
            return 'sql'
            
        # Java/C++/C#
        if re.search(r'(public|private|protected)\s+(static\s+)?\w+\s+\w+\s*\(', code_text):
            # More specific patterns could distinguish between them
            if re.search(r'System\.out\.println', code_text):
                return 'java'
            if re.search(r'Console\.WriteLine', code_text):
                return 'csharp'
            if re.search(r'std::', code_text):
                return 'cpp'
            return 'java'  # Default guess among the C-family
            
        # Shell/Bash
        if re.search(r'^#!.*sh', code_text) or \
           re.search(r'\$\s+', code_text):
            return 'bash'
        
        # Default fallback
        return 'text'
    
    def html_to_text(self, html_file, text_file):
        """Extract text content from HTML files"""
        text_data = []
        
        try:
            with open(html_file, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        html_dict = json.loads(line)
                        
                        url = html_dict.get('url', '')
                        html_content = html_dict.get('text', '')
                        
                        if not html_content:
                            continue
                        
                        # Parse HTML
                        soup = BeautifulSoup(html_content, 'html.parser')
                        
                        # Extract title
                        title = None
                        if soup.title:
                            title = soup.title.get_text(strip=True)
                        
                        # Extract main content using a hierarchical approach
                        content = ""
                        
                        # First try to find main content containers
                        main_elements = soup.find_all(['main', 'article', 'div'], 
                                                    class_=lambda c: c and any(x in str(c).lower() 
                                                                             for x in ['content', 'main', 'article', 'documentation', 'docs']))
                        
                        if main_elements:
                            # Use the largest content block
                            largest = max(main_elements, key=lambda x: len(x.get_text()))
                            content = largest.get_text('\n', strip=True)
                        
                        # If no main content found, extract from headings and paragraphs
                        if not content:
                            for tag in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p']):
                                content += tag.get_text(strip=True) + "\n\n"
                        
                        # If still no content, use all text but skip scripts and styles
                        if not content:
                            # Remove script and style elements
                            for script in soup(['script', 'style']):
                                script.extract()
                            content = soup.get_text('\n', strip=True)
                        
                        # Create text data entry
                        text_entry = {
                            'url': url,
                            'host_url': html_dict.get('host_url', self._extract_host_url(url)),
                            'title': title,
                            'content': content
                        }
                        
                        text_data.append(text_entry)
                        
                    except json.JSONDecodeError:
                        logging.warning(f"Error parsing JSON in HTML file")
                    except Exception as e:
                        logging.warning(f"Error processing HTML: {str(e)}")
            
            # Save text data
            with open(text_file, 'w', encoding='utf-8') as f:
                for entry in text_data:
                    f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            
            logging.info(f"Extracted text from {len(text_data)} HTML documents")
            
        except Exception as e:
            logging.error(f"Error processing HTML file: {str(e)}")
    
    def _extract_host_url(self, url):
        """Extract host URL from a full URL"""
        try:
            parsed = urlparse(url)
            return f"{parsed.scheme}://{parsed.netloc}"
        except:
            return url
    
    def crawl_all(self, urls, max_depth=3, max_threads=20):
        """Crawl multiple URLs sequentially"""
        results = {}
        
        for i, url in enumerate(urls):
            print(f"Crawling [{i+1}/{len(urls)}]: {url}")
            
            # Add delay between sites
            if i > 0:
                delay = 2 + random.random() * 3  # 2-5 seconds
                time.sleep(delay)
            
            try:
                processed = self.crawl(url, max_depth, max_threads)
                results[url] = len(processed)
                print(f"Completed crawling: {url} - Processed {len(processed)} pages")
            except Exception as e:
                print(f"Error crawling {url}: {str(e)}")
                logging.error(f"Error crawling {url}: {str(e)}", exc_info=True)
                results[url] = 0
        
        return results