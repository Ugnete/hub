import requests
from fake_useragent import UserAgent
import time
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlsplit
import logging
import json
import os
from requests.exceptions import Timeout, RequestException
import re
import math
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import WebDriverException, TimeoutException
from selenium.webdriver.common.by import By
import random

class WebHtmlExtractor():
    '''Extract web HTML data, with requests and selenium methods;
       selenium requires Chrome browser and chromedriver installed and configured.
    '''

    def __init__(self, header=None, data={}, time_sleep=1, time_out=20, max_retry_times=3):
        # Maximum retry count
        self.max_retry_times = max_retry_times
        # Custom headers for requests
        if header:
            self.header = header
        else:
            # Random User-Agent for each request to avoid blocking
            self.header = {
                'User-Agent': UserAgent().random,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0',
                'Cookie': None
            }
        # Data for POST requests
        self.data = data
        # Delay between requests (seconds)
        self.time_sleep = time_sleep
        # Request timeout (seconds)
        self.time_out = time_out
        # Track visited URLs to avoid duplicates
        self.visited_urls = set()

    def save_url_html(self, base_url=None, reptile_lib="requests", method="get", time_sleep=None, time_out=None, html_dir=None, mode="w"):
        '''
        Send a request to base_url and save the HTML response
        '''
        if time_out is None:
            time_out = self.time_out
        if time_sleep is None:
            time_sleep = self.time_sleep
        
        # Create save directory
        os.makedirs(os.path.dirname(html_dir), exist_ok=True)
        
        # Send request and get HTML
        html_dict = self.get_html_dict(
            url=base_url, reptile_lib=reptile_lib, method=method, time_sleep=time_sleep, time_out=time_out)
        
        # Check if we got a valid response
        if html_dict and html_dict.get('status'):
            # Save HTML to file
            self.save_jsonl(file_path=html_dir, json_list=[html_dict], mode=mode)
            logging.info(f"Successfully saved HTML for {base_url}")
            return True
        else:
            logging.warning(f"Failed to retrieve HTML from {base_url}")
            return False

    def save_1_jump_url_in_base(self, base_url=None, target_url_prefix=None, reptile_lib="requests", method="get", time_sleep=None, time_out=None, html_dir=None, mode="w"):
        '''
        Crawl base_url and all 1st-degree links
        '''
        if time_out is None:
            time_out = self.time_out
        if time_sleep is None:
            time_sleep = self.time_sleep
        
        # Create save directory
        os.makedirs(os.path.dirname(html_dir), exist_ok=True)
        
        # Get base URL HTML
        html_dict = self.get_html_dict(
            url=base_url, reptile_lib=reptile_lib, method=method, time_sleep=time_sleep, time_out=time_out)
        
        # Use base_url as prefix if none specified
        if target_url_prefix is None:
            target_url_prefix = html_dict.get('url', base_url)
        
        # Extract links from the page
        sub_url_list = self.get_link_sub_url_list(html_dict=html_dict, target_url_prefix=target_url_prefix)
        
        # Log info
        sub_url_nums = len(sub_url_list)
        logging.info(f"Base URL {base_url} contains {sub_url_nums} URLs")
        
        # Save base URL HTML
        self.save_jsonl(file_path=html_dir, json_list=[html_dict], mode=mode)
        
        # Process each URL from the list
        for k, sub_url in enumerate(sub_url_list):
            if k == 0:
                continue  # Skip the first URL (base_url)
                
            logging.info(f"Processing URL {k+1}/{sub_url_nums} ({round((k+1)/sub_url_nums*100, 1)}%): {sub_url}")
            
            # Get HTML for the current URL
            sub_html_dict = self.get_html_dict(
                url=sub_url, reptile_lib=reptile_lib, method=method, time_sleep=time_sleep, time_out=time_out)
            
            # Save HTML data
            if sub_html_dict and sub_html_dict.get('status'):
                self.save_jsonl(file_path=html_dir, json_list=[sub_html_dict], mode="a")
                logging.info(f"Saved HTML for {sub_url}")
            else:
                logging.warning(f"Failed to retrieve HTML from {sub_url}")

    def get_html_dict(self, url=None, reptile_lib="requests", method="get", selenium_headless=True, time_sleep=None, time_out=None):
        '''
        Send a request to URL and return HTML as dictionary
        '''
        assert reptile_lib in ("requests", "selenium"), "reptile_lib must be 'requests' or 'selenium'"
        
        if time_out is None:
            time_out = self.time_out
        if time_sleep is None:
            time_sleep = self.time_sleep
        
        # Use the appropriate method to retrieve HTML
        if reptile_lib == "requests":
            html_dict = self.get_request_html(
                url=url, method=method, time_sleep=time_sleep, time_out=time_out)
        elif reptile_lib == "selenium":
            html_dict = self.get_selenium_html(
                url=url, method=method, time_sleep=time_sleep, time_out=time_out, headless=selenium_headless)
        
        return html_dict

    def get_request_html(self, url=None, method="get", time_sleep=None, retry_times=1, header=None, data=None, time_out=None):
        '''
        Send requests to URL and return HTML as dictionary
        '''
        assert method in ("get", "post"), "method must be 'get' or 'post'"
        
        # Use custom header if provided
        if header:
            self.header = header
        else:
            # Add a random User-Agent to avoid being blocked
            self.header['User-Agent'] = UserAgent().random
            
        if data:
            self.data = data
        if time_out is None:
            time_out = self.time_out
        if time_sleep is None:
            time_sleep = self.time_sleep
        
        # Delay before request to avoid rate limiting
        time.sleep(time_sleep)
        
        # Initialize HTML dictionary with default values
        html_dict = {
            'url': url,
            'host_url': self.split_host_url(url),
            'text': None,
            'status': False
        }
        
        # Try to send the request
        try:
            if method == "get":
                response = requests.get(url, headers=self.header, timeout=time_out, verify=False)
            elif method == "post":
                response = requests.post(url, headers=self.header, data=self.data, timeout=time_out, verify=False)
            
            # Check if the response was successful
            if response.status_code == 200:
                # Update HTML dictionary with response data
                html_dict['url'] = response.url
                html_dict['host_url'] = self.split_host_url(response.url)
                html_dict['text'] = response.text
                html_dict['status'] = True
                logging.info(f"Request to {url} returned successfully")
                return html_dict
            else:
                # Handle non-200 response
                logging.warning(f"Request to {url} returned status code {response.status_code}")
                
        except (Timeout, RequestException) as e:
            # Handle timeouts and other request exceptions
            logging.warning(f"Request to {url} failed: {str(e)}")
        
        # Retry if we haven't reached the maximum retry count
        if retry_times <= self.max_retry_times:
            logging.warning(f"Retrying {url} (attempt {retry_times}/{self.max_retry_times})")
            # Increase delay for retries to avoid rate limiting
            return self.get_request_html(
                url=url, method=method, time_sleep=time_sleep*1.5, retry_times=retry_times+1)
        else:
            logging.warning(f"Failed to retrieve {url} after {self.max_retry_times} attempts")
            return html_dict

    def get_selenium_html(self, url=None, method="get", time_sleep=None, retry_times=1, headless=True, time_out=None):
        '''
        Use Selenium to render page and return HTML as dictionary
        '''
        assert method == "get", "Selenium only supports GET method"
        
        if time_out is None:
            time_out = self.time_out
        if time_sleep is None:
            time_sleep = self.time_sleep
            
        # Initialize HTML dictionary
        html_dict = {
            'url': url,
            'host_url': self.split_host_url(url),
            'text': None,
            'status': False
        }
            
        # Configure Chrome options
        options = Options()
        options.headless = headless
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument(f"user-agent={UserAgent().random}")
        
        driver = None
        try:
            # Initialize Chrome driver
            driver = webdriver.Chrome(options=options)
            
            # Add a delay
            time.sleep(time_sleep)
            
            # Load the URL
            driver.get(url)
            
            # Wait for page to load
            wait = WebDriverWait(driver, time_out)
            wait.until(EC.visibility_of_any_elements_located((By.TAG_NAME, "body")))
            
            # Additional wait for dynamic content
            time.sleep(time_sleep)
            
            # Get page content
            page_source = driver.page_source
            current_url = driver.current_url
            
            # Update HTML dictionary
            html_dict['url'] = current_url
            html_dict['host_url'] = self.split_host_url(current_url)
            html_dict['text'] = page_source
            html_dict['status'] = True
            
            logging.info(f"Selenium successfully retrieved {url}")
            
        except (WebDriverException, TimeoutException) as e:
            logging.warning(f"Selenium error for {url}: {str(e)}")
            
            # Retry if we haven't reached the maximum retry count
            if retry_times <= self.max_retry_times:
                logging.warning(f"Retrying {url} with Selenium (attempt {retry_times}/{self.max_retry_times})")
                # Clean up before retry
                if driver:
                    driver.quit()
                # Increase delay for retries
                return self.get_selenium_html(
                    url=url, time_sleep=time_sleep*1.5, retry_times=retry_times+1, headless=headless)
            else:
                logging.warning(f"Failed to retrieve {url} with Selenium after {self.max_retry_times} attempts")
                
        finally:
            # Always clean up the driver
            if driver:
                driver.quit()
                
        return html_dict

    def get_link_sub_url_list(self, html_dict={}, target_url_prefix=None):
        '''
        Extract all links from HTML that match the target prefix
        '''
        # Get HTML content and URL
        html_content = html_dict.get('text')
        url = html_dict.get('url')
        
        # Return empty list if there's no HTML content
        if not html_content:
            return [url] if url else []
        
        # Create BeautifulSoup object
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Find all links
        links = soup.find_all('a')
        
        # Start with the current URL
        sub_url_list = [url] if url else []
        
        # Use URL as prefix if none provided
        if target_url_prefix is None:
            target_url_prefix = url
            
        # Extract the host URL for relative links
        host_url = self.split_host_url(url) if url else ""
        
        # Process all links
        for link in links:
            href = link.get('href')
            if href:
                # Skip anchors, javascript, and mailto links
                if href.startswith('#') or href.startswith('javascript:') or href.startswith('mailto:'):
                    continue
                    
                # Convert relative URLs to absolute
                absolute_url = urljoin(host_url, href)
                
                # Only include URLs that match the prefix
                if absolute_url.startswith(target_url_prefix):
                    # Remove fragments
                    clean_url = absolute_url.split('#')[0]
                    sub_url_list.append(clean_url)
        
        # Remove duplicates while preserving order
        return list(dict.fromkeys(sub_url_list))

    def save_jsonl(self, json_list=[], file_path=None, mode="w"):
        '''
        Save JSON list to JSONL file
        '''
        try:
            with open(file_path, mode, encoding="utf-8") as f:
                for line in json_list:
                    f.write(json.dumps(line, ensure_ascii=False) + "\n")
        except Exception as e:
            logging.error(f"Error saving to {file_path}: {str(e)}")

    def split_host_url(self, url):
        '''
        Extract host domain from URL
        '''
        if not url:
            return ""
            
        try:
            parsed_url = urlsplit(url)
            host_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
            return host_url
        except Exception as e:
            logging.warning(f"Error parsing URL {url}: {str(e)}")
            return ""