import time
from bs4 import BeautifulSoup
import logging
import json
import os
from tqdm import tqdm
import re
from .DocTokenizer import DocTokenizer
import html
import hashlib

logging.basicConfig(level=logging.INFO)


class Html2Text():
    '''From html extract text content.
    '''

    def __init__(self):
        pass

    def html2text(self,
                  target_content_tag={},
                  target_tag_list=[],
                  html_dir=None,
                  text_dir=None,
                  mode="w",
                  is_get_all_text=False
                  ):
        assert isinstance(target_content_tag, dict), "target_content_tag should be in dictionary format!"
        assert len(target_content_tag.keys()) <= 1, "target_content_tag attribute dictionary can only specify a unique element!"
        for _ in target_tag_list:
            assert isinstance(_, dict), "target_tag_list elements should be in dictionary format!"
            assert len(_.keys()) <= 1, "Target_tag_list attribute dictionary in the list can only specify a unique element!"
        # Create save directory
        os.makedirs(os.path.dirname(text_dir), exist_ok=True)
        # Read file
        logging.info("Reading files...")
        html_dict_list = self.read_html_jsonl(html_dir)
        url_nums = len(html_dict_list)
        logging.info(f"Total {url_nums} html URLs")
        # Process each line of html data: extract content text and specified tag content from html
        text_dict_list = []
        for html_dict in tqdm(html_dict_list, mininterval=1):
            # Whether to get all text content
            text_dict = self.get_text_dict(
                html_dict=html_dict,
                target_content_tag=target_content_tag,
                target_tag_list=target_tag_list,
                is_get_all_text=is_get_all_text
            )
            text_dict_list.append(text_dict)
        logging.info("Saving text content extracted from html...")
        self.save_text_jsonl(json_list=text_dict_list,
                             file_path=text_dir,
                             mode=mode)
        logging.info(f"Save successful! Address: {text_dir}")

    def get_text_dict(self,
                      html_dict={},
                      target_content_tag={},
                      target_tag_list=[],
                      is_get_all_text=True
                      ):
        # Format definition
        assert isinstance(target_content_tag, dict), "target_content_tag should be in dictionary format!"
        assert len(target_content_tag.keys()) <= 1, "target_content_tag attribute dictionary can only specify a unique element!"
        for _ in target_tag_list:
            assert isinstance(_, dict), "target_tag_list elements should be in dictionary format!"
            assert len(_.keys()) <= 1, "Target_tag_list attribute dictionary in the list can only specify a unique element!"
        # Extract html content
        html_content = html_dict['text']
        url = html_dict['url']
        host_url = html_dict.get('host_url', self._extract_host_url(url))
        
        # Check if HTML content is valid
        if not html_content:
            # Return empty dictionary with metadata
            text_dict = {
                'url': url,
                'host_url': host_url,
                'title': None,
                'content': '',
            }
            if is_get_all_text:
                text_dict['all_text'] = ''
            return text_dict
            
        # Create BeautifulSoup object
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Process pre code blocks, add ``` quotes
        self._process_code_blocks(soup)
        
        # Extract HTML text content
        doc_tokenizer = DocTokenizer()
        text_dict = {}
        text_dict['url'] = url
        text_dict['host_url'] = host_url
        
        # Extract webpage title, set to empty if not exists
        try:
            text_dict['title'] = soup.title.text.strip()
        except:
            text_dict['title'] = None
            
        # Whether to extract all text, regardless of tag
        if is_get_all_text:
            all_text = soup.get_text(separator="\n", strip=False)
            text_dict['all_text'] = doc_tokenizer.doc_process(all_text)
            
        # Extract body tag, can be extracted according to the tag's class or according to the tag name
        if target_content_tag:
            text_dict["content"] = self.soup_find_all_text(soup=soup, doc_tokenizer=doc_tokenizer, attrs=target_content_tag)
            
        # Extract html tag content, each tag is saved independently as a field
        for target_tag in target_tag_list:
            if target_tag:
                # Extract target tag name
                tag_ = list(target_tag.values())[0]
                # Extract target tag content
                text_dict[tag_] = self.soup_find_all_text(soup, doc_tokenizer, attrs=target_tag)
                
        return text_dict

    def _process_code_blocks(self, soup):
        """Process and format code blocks in the HTML"""
        # Find all code blocks
        code_blocks = soup.find_all(['pre', 'code'])
        
        for block in code_blocks:
            # Skip empty or very small blocks
            if not block.get_text(strip=True) or len(block.get_text(strip=True)) < 10:
                continue
                
            # Detect language from class or parent class
            language = self._detect_language(block)
            language_tag = f"```{language}\n" if language else "```\n"
            
            # Format the code block content
            code_content = self._preserve_code_formatting(block)
            
            # Only modify if we have content
            if code_content and len(code_content.strip()) > 0:
                # Wrap in markdown code block syntax
                new_content = f"\n{language_tag}{code_content}\n```\n"
                
                # Replace the block content with formatted version
                if block.name == 'pre':
                    block.clear()
                    block.append(new_content)
                else:
                    # For regular code tags
                    block.string = new_content

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
                # Find minimum indentation level (skip empty lines)
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

    def soup_find_all_text(self, soup, doc_tokenizer, attrs):
        assert isinstance(attrs, dict), "attrs should be in dictionary format!"
        assert len(attrs.keys()) == 1, "attrs attribute dictionary can only specify a unique element!"
        if list(attrs.keys())[0] == "name":
            _tags = soup.find_all(name=attrs["name"])
        else:
            _tags = soup.find_all(attrs=attrs)
        tags_text = ""
        for _tag in _tags:
            tag_text = _tag.get_text(separator="\n", strip=False)
            tag_text = doc_tokenizer.doc_process(tag_text)
            tags_text += tag_text.strip() + "\n\n"
        return tags_text

    def read_html_jsonl(self, file_name=None):
        '''
        Read html jsonl file
        '''
        html_dict_list = []
        with open(file_name, "r", encoding="utf-8") as f:
            for k, line in enumerate(f):
                try:
                    line = json.loads(line)
                    html_dict_list.append(line)
                except json.JSONDecodeError:
                    logging.warning(f"Error parsing JSON at line {k+1}")
        return html_dict_list

    def save_text_jsonl(self, json_list=[], file_path=None, mode="w"):
        '''
        Save json_list as jsonl format file
        '''
        with open(file_path, mode, encoding="utf-8") as f:
            for line in json_list:
                f.write(json.dumps(line, ensure_ascii=False) + "\n")

    def extract_code_blocks(self, soup):
        """Extract code blocks with language detection and metadata"""
        code_blocks = []
        
        # Find all code blocks with multiple selectors to ensure good coverage
        for block in soup.find_all(['pre', 'code'], class_=lambda c: c and any(
            x in str(c).lower() for x in ['code', 'highlight', 'syntax', 'language-', 'hljs', 'prettyprint', 'CodeMirror'])):
            
            code_text = block.get_text(strip=True)
            if not code_text or len(code_text) < 10:  # Skip empty or very short blocks
                continue
                
            # Detect language
            language = self._detect_language(block)
            
            # Extract context (e.g., function/class name or description from surrounding elements)
            context = self._extract_code_context(block)
            
            # Generate meaningful name based on content
            block_name = self._generate_block_name(code_text, language, context)
            
            # Properly preserve code formatting
            formatted_code = self._preserve_code_formatting(block)
            
            code_blocks.append({
                'language': language,
                'name': block_name,
                'content': formatted_code,
                'context': context,
                'type': block.name,
                'size': len(formatted_code)
            })
        
        return code_blocks

    def _extract_code_context(self, block):
        """Extract context around the code block"""
        context = {}
        
        # Check for preceding header elements
        header = block.find_previous(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
        if header:
            context['heading'] = header.get_text(strip=True)
        
        # Check for parent section or div with class/id
        parent = block.find_parent(['section', 'div'])
        if parent and (parent.get('class') or parent.get('id')):
            context['section'] = parent.get('id', '') or ' '.join(parent.get('class', []))
        
        # Look for a potential caption or description
        caption = block.find_next('figcaption')
        if not caption:
            caption = block.find_previous('figcaption')
        if caption:
            context['caption'] = caption.get_text(strip=True)
            
        return context
    
    def _generate_block_name(self, code_text, language, context):
        """Generate a meaningful name for the code block"""
        # More advanced function/method detection for different languages
        patterns = {
            'python': r'(def|class)\s+(\w+)',
            'javascript': r'(function|class)\s+(\w+)|const\s+(\w+)\s*=\s*(?:function|\(.*?\)\s*=>)',
            'java': r'(?:public|private|protected|static)?\s*(?:class|void|String|int|boolean)\s+(\w+)',
            'go': r'func\s+(\w+)',
            'ruby': r'def\s+(\w+)',
            'php': r'function\s+(\w+)',
            'csharp': r'(?:public|private|protected|static)?\s*(?:class|void|string|int|bool)\s+(\w+)'
        }
        
        # Try language-specific pattern first
        if language in patterns:
            match = re.search(patterns[language], code_text)
            if match:
                # Get the capture group that contains the name
                name = next((g for g in match.groups()[1:] if g), None)
                if name:
                    return f"{name}_{language}"
        
        # Generic function/method detection as fallback
        generic_patterns = [
            r'(?:function|def|class|void|public|private)\s+(\w+)',  # General function/class
            r'(?:const|let|var)\s+(\w+)\s*=',                       # Variable declarations
            r'@\w+\s*\(\s*["\'](\w+)["\']',                         # Decorators with names
            r'#\s*(\w+)',                                           # Comments with single words
        ]
        
        for pattern in generic_patterns:
            match = re.search(pattern, code_text)
            if match and match.group(1):
                return f"{match.group(1)}_{language}"
        
        # Use section heading if available
        if context and 'heading' in context:
            # Clean and normalize the heading
            heading = re.sub(r'[^\w\s]', '', context['heading']).strip()
            heading = re.sub(r'\s+', '_', heading).lower()
            if heading:
                return f"{heading[:30]}_{language}"
        
        # Use page section/article title if available
        if context and 'section' in context:
            section = re.sub(r'[^\w\s]', '', context['section']).strip()
            section = re.sub(r'\s+', '_', section).lower()
            if section:
                return f"{section[:20]}_{language}"
            
        # Use first line of code if it's short enough
        first_line = code_text.split('\n')[0].strip()
        if 10 <= len(first_line) <= 40:
            clean_name = re.sub(r'[^\w\s]', '', first_line).strip()
            clean_name = re.sub(r'\s+', '_', clean_name).lower()
            if clean_name:
                return f"{clean_name[:25]}_{language}"
        
        # Hash the content for a unique identifier as last resort
        content_hash = hashlib.md5(code_text[:100].encode()).hexdigest()[:8]
        return f"{language}_snippet_{content_hash}"

    def extract_and_save_code_blocks(self, html_dict, code_dir):
        """Extract code blocks from HTML and save to files with proper formatting"""
        if not html_dict.get('text'):
            return []  # No content to process
            
        soup = BeautifulSoup(html_dict['text'], 'html.parser')
        url = html_dict['url']
        
        # Extract domain for folder naming
        domain = url.split("//")[1].split("/")[0].replace(".", "_")
        
        # Extract the last meaningful segment from URL path for folder name
        path_parts = url.split("//")[1].split("/")
        page_folder = "main"
        
        for part in path_parts:
            if part and part not in ["", domain] and "#" not in part:
                # Get the last meaningful path segment
                page_folder = part
        
        # Clean folder name
        page_folder = re.sub(r'[^\w_-]', '_', page_folder)
        if not page_folder:
            page_folder = "main"
        
        # Create directory
        page_dir = os.path.join(code_dir, domain, page_folder)
        os.makedirs(page_dir, exist_ok=True)
        
        # Extract code blocks
        code_blocks = self.extract_code_blocks(soup)
        
        # Save the code blocks
        saved_files = []
        section_counts = {}
        
        for block in code_blocks:
            # Use block name as section name
            section = block['name'].replace('.', '_')
            
            # Handle duplicate section names
            if section in section_counts:
                section_counts[section] += 1
                file_name = f"{section}_{section_counts[section]}.md"
            else:
                section_counts[section] = 1
                file_name = f"{section}.md"
            
            file_path = os.path.join(page_dir, file_name)
            
            # Write the file with URL and code content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(f"{url}\n\n")
                language_tag = f"```{block['language']}\n" if block['language'] and block['language'] != 'text' else "```\n"
                f.write(language_tag)
                # Write the content with proper formatting
                f.write(block['content'])
                if not block['content'].endswith('\n'):
                    f.write("\n")
                f.write("```\n")
            
            saved_files.append({
                'url': url,
                'file': file_path,
                'name': block['name'],
                'language': block['language']
            })
        
        return saved_files

    def _extract_host_url(self, url):
        """Extract host URL from a full URL"""
        try:
            if not url:
                return ""
            parts = url.split("//")
            if len(parts) > 1:
                host_parts = parts[1].split("/")
                return f"{parts[0]}//{host_parts[0]}"
            return url
        except Exception as e:
            logging.warning(f"Error extracting host URL from {url}: {str(e)}")
            return url