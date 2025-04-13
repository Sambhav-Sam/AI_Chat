#!/usr/bin/env python3
"""
Web Scraping Task for Isolated Execution
This module is executed inside a Docker container.
"""

import os
import json
import sys
import time
import traceback
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup

def execute(params):
    """
    Execute a web scraping task with the given parameters
    
    Parameters:
    params (dict): Task parameters including:
        - url: Target URL to scrape
        - depth: Depth of scraping (number of links to follow)
        - max_pages: Maximum number of pages to scrape
        - selectors: CSS selectors to extract specific content
    
    Returns:
    dict: Results of the scraping task
    """
    try:
        url = params.get('url', 'https://example.com')
        depth = int(params.get('depth', 1))
        max_pages = int(params.get('max_pages', 5))
        selectors = params.get('selectors', {'title': 'title', 'content': 'p'})
        
        print(f"Starting web scrape of {url} with depth {depth}, max_pages {max_pages}")
        
        # Validate URL
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            return {
                'success': False,
                'error': f"Invalid URL: {url}",
                'error_type': 'validation_error'
            }
        
        # Initialize results
        results = {
            'success': True,
            'pages_scraped': 0,
            'data': [],
            'execution_time': 0,
            'urls_visited': []
        }
        
        start_time = time.time()
        
        # Set of visited URLs to avoid duplicates
        visited = set()
        # Queue of URLs to visit (url, current_depth)
        to_visit = [(url, 0)]
        
        # Main scraping loop
        while to_visit and results['pages_scraped'] < max_pages:
            current_url, current_depth = to_visit.pop(0)
            
            if current_url in visited:
                continue
                
            visited.add(current_url)
            results['urls_visited'].append(current_url)
            
            try:
                print(f"Scraping {current_url} (depth {current_depth})")
                response = requests.get(current_url, timeout=10)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Extract data based on selectors
                page_data = {
                    'url': current_url,
                    'depth': current_depth,
                    'extracted': {}
                }
                
                for key, selector in selectors.items():
                    elements = soup.select(selector)
                    page_data['extracted'][key] = [elem.get_text().strip() for elem in elements]
                
                results['data'].append(page_data)
                results['pages_scraped'] += 1
                
                # If we haven't reached max depth, add links to queue
                if current_depth < depth:
                    links = soup.find_all('a', href=True)
                    for link in links:
                        href = link['href']
                        
                        # Handle relative URLs
                        if not href.startswith(('http://', 'https://')):
                            base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
                            if href.startswith('/'):
                                href = f"{base_url}{href}"
                            else:
                                href = f"{base_url}/{href}"
                        
                        if href not in visited:
                            to_visit.append((href, current_depth + 1))
            
            except requests.exceptions.RequestException as e:
                print(f"Error scraping {current_url}: {str(e)}")
                # We continue processing other URLs even if one fails
        
        # Calculate execution time
        results['execution_time'] = time.time() - start_time
        
        return results
    
    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f"Error in web scraping task: {str(e)}")
        print(error_traceback)
        
        return {
            'success': False,
            'error': str(e),
            'traceback': error_traceback,
            'error_type': 'execution_error'
        }

if __name__ == "__main__":
    # When executed directly inside the container, read parameters from stdin
    try:
        # Read params from stdin
        params_json = sys.stdin.read()
        params = json.loads(params_json)
        
        # Execute the task
        result = execute(params)
        
        # Output result to stdout
        print(json.dumps(result, indent=2))
    except Exception as e:
        error_traceback = traceback.format_exc()
        error_result = {
            'success': False,
            'error': str(e),
            'traceback': error_traceback,
            'error_type': 'system_error'
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1) 