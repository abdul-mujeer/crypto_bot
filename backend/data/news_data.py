import requests
import pandas as pd
from datetime import datetime
import os
import logging
import re
from dotenv import load_dotenv

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class NewsFetcher:
    def __init__(self):
        # CryptoPanic API key - store this in your .env file
        self.api_key = os.getenv('CRYPTOPANIC_API_KEY', '')
        self.base_url = 'https://cryptopanic.com/api/v1'
        
        if not self.api_key:
            logger.warning("CRYPTOPANIC_API_KEY not found in environment variables. API calls may be limited.")
    
    def fetch_crypto_news(self, categories=None, items_per_category=50):
        """
        Fetch crypto news from CryptoPanic API
        
        Args:
            categories: Comma-separated list of currencies to fetch news for (e.g., 'BTC,ETH')
            items_per_category: Number of news items to fetch per category
            
        Returns:
            pandas.DataFrame: DataFrame containing news data
        """
        try:
            logger.info(f"Fetching news for categories: {categories}")
            
            # If no categories provided, fetch general crypto news
            if not categories:
                return self._fetch_general_news(limit=items_per_category)
            
            # Split categories and fetch news for each
            all_news = []
            for currency in categories.split(','):
                currency_news = self._fetch_news_for_currency(currency.strip(), limit=items_per_category)
                if not currency_news.empty:
                    all_news.append(currency_news)
            
            # Combine all news and remove duplicates
            if all_news:
                combined_df = pd.concat(all_news, ignore_index=True)
                # Remove duplicates based on URL
                combined_df = combined_df.drop_duplicates(subset=['url'])
                # Sort by timestamp (newest first)
                combined_df = combined_df.sort_values('timestamp', ascending=False)
                return combined_df
            
            # If no specific news found, return general news
            return self._fetch_general_news(limit=items_per_category)
            
        except Exception as e:
            logger.error(f"Error fetching crypto news: {e}")
            import traceback
            traceback.print_exc()
            return pd.DataFrame()
    
    def _fetch_general_news(self, limit=50):
        """Fetch general crypto news"""
        try:
            # Prepare the API endpoint
            endpoint = f"{self.base_url}/posts/"
            
            params = {
                'auth_token': self.api_key,
                'public': 'true',
                'kind': 'news',
                'limit': limit
            }
            
            # Make the API request
            response = requests.get(endpoint, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            if 'results' not in data:
                logger.error(f"API Error: {data.get('error', 'Unknown error')}")
                return pd.DataFrame()
            
            # Process the news data
            return self._process_news_data(data['results'])
            
        except Exception as e:
            logger.error(f"Error fetching general news: {e}")
            return pd.DataFrame()
    
    def _fetch_news_for_currency(self, currency, limit=50):
        """Fetch news for a specific currency"""
        try:
            # Prepare the API endpoint
            endpoint = f"{self.base_url}/posts/"
            
            params = {
                'auth_token': self.api_key,
                'currencies': currency,
                'public': 'true',
                'kind': 'news',
                'limit': limit
            }
            
            # Make the API request
            response = requests.get(endpoint, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            if 'results' not in data:
                logger.error(f"API Error for {currency}: {data.get('error', 'Unknown error')}")
                return pd.DataFrame()
            
            # Process the news data
            return self._process_news_data(data['results'], related_coin=currency)
            
        except Exception as e:
            logger.error(f"Error fetching news for {currency}: {e}")
            return pd.DataFrame()
    
    def _analyze_sentiment(self, text, title=""):
        """
        Simple sentiment analysis based on keyword matching
        
        Args:
            text: Text to analyze
            title: Title of the news (optional, will be given more weight)
            
        Returns:
            float: Sentiment score between -1 (negative) and 1 (positive)
        """
        if not text and not title:
            return 0.0
        
        # Combine title and text, giving more weight to the title
        combined_text = f"{title} {title} {text}" if title else text
        combined_text = combined_text.lower()
        
        # Define positive and negative keywords
        positive_keywords = [
            'bullish', 'surge', 'soar', 'gain', 'rally', 'jump', 'rise', 'up', 'high', 'growth',
            'positive', 'profit', 'success', 'win', 'good', 'strong', 'boost', 'improve', 'recover',
            'breakthrough', 'milestone', 'partnership', 'adoption', 'launch', 'upgrade'
        ]
        
        negative_keywords = [
            'bearish', 'crash', 'plunge', 'drop', 'fall', 'down', 'low', 'decline', 'negative',
            'loss', 'fail', 'bad', 'weak', 'poor', 'worse', 'struggle', 'problem', 'issue',
            'concern', 'risk', 'threat', 'hack', 'scam', 'fraud', 'ban', 'regulate', 'investigation'
        ]
        
        # Count occurrences of keywords
        positive_count = sum(combined_text.count(word) for word in positive_keywords)
        negative_count = sum(combined_text.count(word) for word in negative_keywords)
        
        # Calculate sentiment score
        total_count = positive_count + negative_count
        if total_count == 0:
            return 0.0  # Neutral if no keywords found
        
        return (positive_count - negative_count) / (positive_count + negative_count)
    
    def _get_sentiment_label(self, score):
        """
        Get sentiment label based on score
        
        Args:
            score: Sentiment score between -1 and 1
            
        Returns:
            str: Sentiment label
        """
        if score >= 0.6:
            return 'positive'
        elif score >= 0.2:
            return 'slightly positive'
        elif score >= -0.2:
            return 'neutral'
        elif score >= -0.6:
            return 'slightly negative'
        else:
            return 'negative'
    
    def _process_news_data(self, news_items, related_coin=None):
        """Process news data from CryptoPanic API"""
        processed_items = []
        
        for item in news_items:
            try:
                # Extract the main news data
                news = item.get('news', {})
                
                # Get the timestamp
                created_at = item.get('created_at')
                if created_at:
                    try:
                        # CryptoPanic uses ISO format timestamps
                        timestamp = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    except:
                        timestamp = datetime.now()
                else:
                    timestamp = datetime.now()
                
                # Get related currencies
                currencies = []
                if related_coin:
                    currencies.append(related_coin)
                
                for currency in item.get('currencies', []):
                    code = currency.get('code')
                    if code and code not in currencies:
                        currencies.append(code)
                
                related_coins = ','.join(currencies)
                
                # Get the title and text content
                title = news.get('title', '')
                text = news.get('text', '')
                
                # If title or text is empty, try to get from other fields
                if not title:
                    title = item.get('title', '')
                
                if not text:
                    text = item.get('body', '')
                
                # If still empty, use a placeholder
                if not title:
                    title = "Cryptocurrency News Update"
                
                if not text:
                    text = f"News update related to {related_coins if related_coins else 'cryptocurrencies'}."
                
                # Analyze sentiment using our simple method
                sentiment_score = self._analyze_sentiment(text, title)
                
                # Get sentiment label
                sentiment_label = self._get_sentiment_label(sentiment_score)
                
                # Create news item with the structure expected by the existing API
                # Make sure field names match exactly with the BigQuery schema
                processed_items.append({
                    'timestamp': timestamp,
                    'source': news.get('source', {}).get('title', 'CryptoPanic'),
                    'headline': title,
                    'snippet': text[:200],  # Store shorter version in 'snippet' field
                    'url': news.get('url', ''),
                    'sentiment_score': sentiment_score,
                    'sentiment_label': sentiment_label,
                    'related_coins': related_coins
                })
                
                logger.info(f"Processed news: {title[:50]}... | Sentiment: {sentiment_score:.2f} ({sentiment_label})")
                
            except Exception as e:
                logger.error(f"Error processing news item: {e}")
                continue
        
        # Create DataFrame
        return pd.DataFrame(processed_items)
    
    def fetch_news_for_symbol(self, symbol, limit=10):
        """
        Fetch news specifically for a given trading symbol
        
        Args:
            symbol: Trading symbol (e.g., 'BTC/USDT')
            limit: Maximum number of news items to return
            
        Returns:
            pandas.DataFrame: DataFrame containing news data for the symbol
        """
        # Extract the base currency from the symbol (e.g., 'BTC' from 'BTC/USDT')
        base_currency = symbol.split('/')[0] if '/' in symbol else symbol
        
        # Fetch news for this specific currency
        return self._fetch_news_for_currency(base_currency, limit=limit)

if __name__ == "__main__":
    # Test the news fetcher
    fetcher = NewsFetcher()
    
    # Test general news
    print("Fetching general crypto news...")
    news = fetcher.fetch_crypto_news()
    if not news.empty:
        print(f"Fetched {len(news)} general news items")
        print(news[['headline', 'source', 'sentiment_label', 'sentiment_score']].head())
    else:
        print("No general news found")
    
    # Test news for specific currency
    print("\nFetching BTC news...")
    btc_news = fetcher.fetch_news_for_symbol('BTC/USDT', limit=5)
    if not btc_news.empty:
        print(f"Fetched {len(btc_news)} BTC news items")
        print(btc_news[['headline', 'source', 'sentiment_label', 'sentiment_score']].head())
    else:
        print("No BTC news found")
