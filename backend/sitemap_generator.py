"""
Dynamic Sitemap Generator for n4mint
Generates sitemap.xml with all pages and proper priorities
"""
from datetime import datetime
from typing import List, Dict
import os

class SitemapGenerator:
    def __init__(self, base_url: str = "https://n4mint.com"):
        self.base_url = base_url.rstrip('/')
        self.pages = []
        
    def add_page(self, path: str, priority: float = 0.5, changefreq: str = 'weekly', lastmod: str = None):
        """Add a page to the sitemap"""
        if lastmod is None:
            lastmod = datetime.now().strftime('%Y-%m-%d')
        
        self.pages.append({
            'loc': f"{self.base_url}{path}",
            'lastmod': lastmod,
            'changefreq': changefreq,
            'priority': priority
        })
    
    def add_pages_from_config(self):
        """Add all main pages with SEO-optimized priorities"""
        # Main pages - highest priority
        self.add_page('/', priority=1.0, changefreq='daily')
        self.add_page('/pricing', priority=0.9, changefreq='monthly')
        self.add_page('/features', priority=0.9, changefreq='monthly')
        self.add_page('/about', priority=0.8, changefreq='monthly')
        self.add_page('/contact', priority=0.7, changefreq='monthly')
        
        # Product pages
        self.add_page('/transcription', priority=0.9, changefreq='weekly')
        self.add_page('/transcription/podcasts', priority=0.8, changefreq='weekly')
        self.add_page('/transcription/meetings', priority=0.8, changefreq='weekly')
        self.add_page('/transcription/interviews', priority=0.8, changefreq='weekly')
        self.add_page('/transcription/videos', priority=0.8, changefreq='weekly')
        
        # Use cases
        self.add_page('/use-cases/podcasters', priority=0.7, changefreq='monthly')
        self.add_page('/use-cases/content-creators', priority=0.7, changefreq='monthly')
        self.add_page('/use-cases/businesses', priority=0.7, changefreq='monthly')
        self.add_page('/use-cases/researchers', priority=0.7, changefreq='monthly')
        
        # Blog posts (example - would be dynamic in production)
        self.add_page('/blog', priority=0.8, changefreq='daily')
        self.add_page('/blog/ai-transcription-guide', priority=0.6, changefreq='monthly')
        self.add_page('/blog/podcast-transcription-tips', priority=0.6, changefreq='monthly')
        self.add_page('/blog/meeting-transcription-best-practices', priority=0.6, changefreq='monthly')
        self.add_page('/blog/video-to-text-complete-guide', priority=0.6, changefreq='monthly')
        
        # Support
        self.add_page('/support', priority=0.6, changefreq='monthly')
        self.add_page('/faq', priority=0.8, changefreq='monthly')
        self.add_page('/privacy', priority=0.4, changefreq='yearly')
        self.add_page('/terms', priority=0.4, changefreq='yearly')
    
    def generate_xml(self) -> str:
        """Generate the XML sitemap"""
        xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        
        for page in self.pages:
            xml += '  <url>\n'
            xml += f'    <loc>{page["loc"]}</loc>\n'
            xml += f'    <lastmod>{page["lastmod"]}</lastmod>\n'
            xml += f'    <changefreq>{page["changefreq"]}</changefreq>\n'
            xml += f'    <priority>{page["priority"]}</priority>\n'
            xml += '  </url>\n'
        
        xml += '</urlset>'
        return xml
    
    def save_to_file(self, filepath: str = 'sitemap.xml'):
        """Save sitemap to file"""
        xml = self.generate_xml()
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(xml)
        print(f"Sitemap saved to {filepath}")
        print(f"Total pages: {len(self.pages)}")
        return xml

def generate_sitemap():
    """Generate and save sitemap"""
    generator = SitemapGenerator()
    generator.add_pages_from_config()
    return generator.generate_xml()

if __name__ == "__main__":
    generator = SitemapGenerator()
    generator.add_pages_from_config()
    generator.save_to_file('sitemap.xml')
