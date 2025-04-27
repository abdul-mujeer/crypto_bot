import os
import ccxt
import pandas as pd
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MarketDataFetcher:
    def __init__(self, exchange_id='binance', symbols=None):
        self.exchange_id = exchange_id
        self.symbols = symbols or ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT']
        self.exchange = self._initialize_exchange()
        
    def _initialize_exchange(self):
        """Initialize the CCXT exchange object."""
        try:
            exchange_class = getattr(ccxt, self.exchange_id)
            exchange = exchange_class({
                'apiKey': os.getenv('EXCHANGE_API_KEY'),
                'secret': os.getenv('EXCHANGE_SECRET_KEY'),
                'enableRateLimit': True,
            })
            logger.info(f"Successfully initialized {self.exchange_id} exchange")
            return exchange
        except Exception as e:
            logger.error(f"Failed to initialize exchange: {e}")
            raise
    
    def fetch_ticker(self, symbol):
        """Fetch current ticker data for a symbol."""
        try:
            ticker = self.exchange.fetch_ticker(symbol)
            return {
                'symbol': symbol,
                'timestamp': datetime.fromtimestamp(ticker['timestamp'] / 1000),
                'open': ticker['open'],
                'high': ticker['high'],
                'low': ticker['low'],
                'close': ticker['close'],
                'volume': ticker['volume'],
                'change': ticker['change'],
                'percentage': ticker['percentage'],
            }
        except Exception as e:
            logger.error(f"Error fetching ticker for {symbol}: {e}")
            return None
    
    def fetch_all_tickers(self):
        """Fetch ticker data for all configured symbols."""
        results = []
        for symbol in self.symbols:
            ticker_data = self.fetch_ticker(symbol)
            if ticker_data:
                results.append(ticker_data)
        return pd.DataFrame(results)
    
    def fetch_ohlcv(self, symbol, timeframe='1h', limit=100):
        """Fetch OHLCV (candlestick) data for a symbol."""
        try:
            ohlcv = self.exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df['symbol'] = symbol
            return df
        except Exception as e:
            logger.error(f"Error fetching OHLCV for {symbol}: {e}")
            return None
    
    def fetch_all_ohlcv(self, timeframe='1h', limit=100):
        """Fetch OHLCV data for all configured symbols."""
        dfs = []
        for symbol in self.symbols:
            df = self.fetch_ohlcv(symbol, timeframe, limit)
            if df is not None and not df.empty:
                dfs.append(df)
        
        if dfs:
            return pd.concat(dfs, ignore_index=True)
        return pd.DataFrame()
    
    def fetch_order_book(self, symbol, limit=20):
        """Fetch order book data for a symbol."""
        try:
            order_book = self.exchange.fetch_order_book(symbol, limit)
            return {
                'symbol': symbol,
                'timestamp': datetime.now(),
                'bids': order_book['bids'],
                'asks': order_book['asks'],
            }
        except Exception as e:
            logger.error(f"Error fetching order book for {symbol}: {e}")
            return None

if __name__ == "__main__":
    # Test the market data fetcher
    from dotenv import load_dotenv
    load_dotenv()
    
    fetcher = MarketDataFetcher()
    print("Fetching tickers...")
    tickers = fetcher.fetch_all_tickers()
    print(tickers)
    
    print("\nFetching OHLCV data...")
    ohlcv = fetcher.fetch_ohlcv('BTC/USDT')
    print(ohlcv.head())