from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import pandas as pd
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv
import concurrent.futures
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import our modules - properly import all modules
from data.bigquery_storage import BigQueryStorage
from data.market_data import MarketDataFetcher
from data.news_data import NewsFetcher
from analysis.technical_analysis import TechnicalAnalyzer
from analysis.signal_generator import SignalGenerator
# Import automated trading if needed
# from trading.automated_trading import AutomatedTrader

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize components
storage = BigQueryStorage()
market_data_fetcher = MarketDataFetcher(exchange_id='binance')
news_fetcher = NewsFetcher()
technical_analyzer = TechnicalAnalyzer()
signal_generator = SignalGenerator()

# New class for market data operations
class MarketDataHelper:
    def __init__(self, storage):
        self.storage = storage
        self.cryptocompare_api_key = os.getenv('CRYPTOCOMPARE_API_KEY', '')
        self.base_url = 'https://min-api.cryptocompare.com/data'
    
    def get_current_prices(self, symbols):
        """
        Get current prices for multiple symbols using CryptoCompare API
        
        Args:
            symbols: List of symbols (e.g., ['BTC', 'ETH'])
            
        Returns:
            dict: Dictionary with symbol as key and price data as value
        """
        try:
            # Convert symbols to comma-separated string
            fsyms = ','.join([s.split('/')[0] if '/' in s else s for s in symbols])
            tsym = 'USDT'  # Quote currency
            
            # Prepare the API endpoint
            endpoint = f"{self.base_url}/pricemultifull?fsyms={fsyms}&tsyms={tsym}"
            
            headers = {}
            if self.cryptocompare_api_key:
                headers['authorization'] = f'Apikey {self.cryptocompare_api_key}'
            
            # Make the API request
            response = requests.get(endpoint, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            
            if 'RAW' not in data:
                logger.error(f"API Error: {data.get('Message', 'Unknown error')}")
                return {}
            
            # Process the price data
            result = {}
            for symbol in symbols:
                base = symbol.split('/')[0] if '/' in symbol else symbol
                if base in data['RAW'] and tsym in data['RAW'][base]:
                    raw_data = data['RAW'][base][tsym]
                    result[symbol] = {
                        'price': raw_data['PRICE'],
                        'change24h_pct': raw_data['CHANGEPCT24HOUR'],
                        'high24h': raw_data['HIGH24HOUR'],
                        'low24h': raw_data['LOW24HOUR'],
                        'volume24h': raw_data['VOLUME24HOUR'],
                        'market_cap': raw_data['MKTCAP'],
                        'last_update': datetime.fromtimestamp(raw_data['LASTUPDATE']).isoformat()
                    }
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching current prices: {e}")
            return {}
    
    def get_market_overview_from_db(self, symbols):
        """
        Get market overview data from BigQuery database
        
        Args:
            symbols: List of symbols (e.g., ['BTC/USDT', 'ETH/USDT'])
            
        Returns:
            list: List of market overview data for each symbol
        """
        result = []
        
        for symbol in symbols:
            try:
                # Get the most recent data point
                recent_data = self.storage.query_recent_market_data(symbol, 2, '1d')
                
                if recent_data.empty or len(recent_data) < 2:
                    continue
                
                # Calculate 24h change
                current = recent_data.iloc[0]
                previous = recent_data.iloc[1]
                
                change24h = ((current['close'] - previous['close']) / previous['close']) * 100
                
                result.append({
                    'symbol': symbol,
                    'price': float(current['close']),
                    'change24h': float(change24h),
                    'high24h': float(current['high']),
                    'low24h': float(current['low']),
                    'volume24h': float(current['volume']),
                    'timestamp': current['timestamp'].isoformat()
                })
                
            except Exception as e:
                logger.error(f"Error processing market data for {symbol}: {e}")
                continue
        
        return result

# Initialize market data helper
market_helper = MarketDataHelper(storage)

@app.route('/api/market-overview', methods=['GET'])
def get_market_overview():
    """
    Get market overview data for multiple cryptocurrencies
    
    Query parameters:
        symbols: Comma-separated list of symbols (e.g., 'BTC/USDT,ETH/USDT')
        source: Data source ('api' or 'db', default: 'api')
    
    Returns:
        JSON array of market overview data
    """
    try:
        # Get symbols from query parameters or use defaults
        symbols_param = request.args.get('symbols', 'BTC/USDT,ETH/USDT,SOL/USDT,XRP/USDT,ADA/USDT,DOGE/USDT,SHIB/USDT,PEPE/USDT,MATIC/USDT')
        symbols = symbols_param.split(',')
        
        # Get data source from query parameters
        source = request.args.get('source', 'api')
        
        if source.lower() == 'db':
            # Get data from database
            result = market_helper.get_market_overview_from_db(symbols)
        else:
            # Get data from CryptoCompare API
            prices = market_helper.get_current_prices(symbols)
            
            # Convert to list format
            result = []
            for symbol, data in prices.items():
                result.append({
                    'symbol': symbol,
                    'price': data['price'],
                    'change24h': data['change24h_pct'],
                    'high24h': data['high24h'],
                    'low24h': data['low24h'],
                    'volume24h': data['volume24h'],
                    'timestamp': data['last_update']
                })
        
        # If no data was found, return fallback data
        if not result:
            # Fallback data
            result = [
                {'symbol': 'BTC/USDT', 'price': 68245.32, 'change24h': 2.5, 'timestamp': datetime.now().isoformat()},
                {'symbol': 'ETH/USDT', 'price': 3421.15, 'change24h': 1.8, 'timestamp': datetime.now().isoformat()},
                {'symbol': 'SOL/USDT', 'price': 142.87, 'change24h': -0.7, 'timestamp': datetime.now().isoformat()},
                {'symbol': 'XRP/USDT', 'price': 0.5423, 'change24h': -1.2, 'timestamp': datetime.now().isoformat()},
                {'symbol': 'ADA/USDT', 'price': 0.45, 'change24h': 0.5, 'timestamp': datetime.now().isoformat()},
                {'symbol': 'DOGE/USDT', 'price': 0.15, 'change24h': 3.2, 'timestamp': datetime.now().isoformat()},
                {'symbol': 'SHIB/USDT', 'price': 0.00002341, 'change24h': -1.2, 'timestamp': datetime.now().isoformat()},
                {'symbol': 'PEPE/USDT', 'price': 0.00000098, 'change24h': 4.5, 'timestamp': datetime.now().isoformat()},
                {'symbol': 'MATIC/USDT', 'price': 0.5723, 'change24h': 0.8, 'timestamp': datetime.now().isoformat()}
            ]
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error fetching market overview: {e}")
        # Return fallback data on error
        fallback = [
            {'symbol': 'BTC/USDT', 'price': 68245.32, 'change24h': 2.5, 'timestamp': datetime.now().isoformat()},
            {'symbol': 'ETH/USDT', 'price': 3421.15, 'change24h': 1.8, 'timestamp': datetime.now().isoformat()},
            {'symbol': 'SOL/USDT', 'price': 142.87, 'change24h': -0.7, 'timestamp': datetime.now().isoformat()},
            {'symbol': 'XRP/USDT', 'price': 0.5423, 'change24h': -1.2, 'timestamp': datetime.now().isoformat()},
            {'symbol': 'SHIB/USDT', 'price': 0.00002341, 'change24h': -1.2, 'timestamp': datetime.now().isoformat()},
            {'symbol': 'PEPE/USDT', 'price': 0.00000098, 'change24h': 4.5, 'timestamp': datetime.now().isoformat()},
            {'symbol': 'MATIC/USDT', 'price': 0.5723, 'change24h': 0.8, 'timestamp': datetime.now().isoformat()}
        ]
        return jsonify(fallback)

@app.route('/api/market-data', methods=['GET'])
def get_market_data():
    symbol = request.args.get('symbol', 'BTC/USDT')
    timeframe = request.args.get('timeframe', '1d')
    limit = int(request.args.get('limit', 100))
    
    # Query data from BigQuery
    data = storage.query_recent_market_data(symbol, limit, timeframe)
    
    if data.empty:
        return jsonify([])
    
    # Convert to list of dictionaries for JSON response
    result = []
    for _, row in data.iterrows():
        result.append({
            'timestamp': row['timestamp'].isoformat(),
            'open': float(row['open']),
            'high': float(row['high']),
            'low': float(row['low']),
            'close': float(row['close']),
            'volume': float(row['volume']),
            'symbol': row['symbol']
        })
    
    return jsonify(result)

@app.route('/api/trading-signals', methods=['GET'])
def get_trading_signals():
    # Query recent trading signals from BigQuery
    query = f"""
    SELECT *
    FROM `{storage.project_id}.{storage.dataset}.trading_signals`
    ORDER BY timestamp DESC
    LIMIT 20
    """
    
    try:
        signals_df = storage.client.query(query).to_dataframe()
        
        if signals_df.empty:
            return jsonify([])
        
        # Convert to list of dictionaries for JSON response
        result = []
        for _, row in signals_df.iterrows():
            result.append({
                'id': str(row.name),  # Use row index as ID
                'symbol': row['symbol'],
                'timestamp': row['timestamp'].isoformat(),
                'signal': row['signal'],
                'price': float(row['price']) if 'price' in row else None,
                'technical_score': float(row['technical_score']) if 'technical_score' in row else None,
                'sentiment_score': float(row['sentiment_score']) if 'sentiment_score' in row else None,
                'confidence': float(row['confidence']) if 'confidence' in row else None,
                'indicators': row['indicators'] if 'indicators' in row else None
            })
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error fetching trading signals: {e}")
        return jsonify([])

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    # Query recent transactions from BigQuery
    query = f"""
    SELECT *
    FROM `{storage.project_id}.{storage.dataset}.transactions`
    ORDER BY timestamp DESC
    LIMIT 20
    """
    
    try:
        transactions_df = storage.client.query(query).to_dataframe()
        
        if transactions_df.empty:
            return jsonify([])
        
        # Convert to list of dictionaries for JSON response
        result = []
        for _, row in transactions_df.iterrows():
            result.append({
                'id': str(row.name),  # Use row index as ID
                'timestamp': row['timestamp'].isoformat(),
                'symbol': row['symbol'],
                'type': row['type'],
                'price': float(row['price']) if 'price' in row else None,
                'amount': float(row['amount']) if 'amount' in row else None,
                'cost': float(row['cost']) if 'cost' in row else None,
                'fee': float(row['fee']) if 'fee' in row else None,
                'signal_id': row['signal_id'] if 'signal_id' in row else None
            })
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error fetching transactions: {e}")
        return jsonify([])

@app.route('/api/performance', methods=['GET'])
def get_performance():
    try:
        # Get all transactions
        transactions_df = storage.get_all_transactions()
        
        if transactions_df.empty:
            return jsonify({
                'total_trades': 0,
                'buy_trades': 0,
                'sell_trades': 0,
                'win_rate': 0,
                'total_profit': 0,
                'total_volume_usd': 0,
                'avg_trade_size_usd': 0,
                'start_date': datetime.now().isoformat(),
                'end_date': datetime.now().isoformat()
            })
        
        # Calculate metrics
        buy_trades = len(transactions_df[transactions_df['type'] == 'BUY'])
        sell_trades = len(transactions_df[transactions_df['type'] == 'SELL'])
        total_trades = buy_trades + sell_trades
        
        # Simple profit calculation (this would be more complex in a real system)
        total_volume_usd = transactions_df['cost'].sum() if 'cost' in transactions_df.columns else 0
        
        # Placeholder for win rate and profit (would need more complex logic in real system)
        win_rate = 0.68  # Placeholder
        total_profit = total_volume_usd * 0.05  # Placeholder: 5% profit
        
        result = {
            'total_trades': total_trades,
            'buy_trades': buy_trades,
            'sell_trades': sell_trades,
            'win_rate': win_rate,
            'total_profit': float(total_profit),
            'total_volume_usd': float(total_volume_usd),
            'avg_trade_size_usd': float(total_volume_usd / total_trades) if total_trades > 0 else 0,
            'start_date': transactions_df['timestamp'].min().isoformat() if 'timestamp' in transactions_df.columns else None,
            'end_date': transactions_df['timestamp'].max().isoformat() if 'timestamp' in transactions_df.columns else None
        }
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error calculating performance: {e}")
        return jsonify({
            'total_trades': 0,
            'buy_trades': 0,
            'sell_trades': 0,
            'win_rate': 0,
            'total_profit': 0,
            'total_volume_usd': 0,
            'avg_trade_size_usd': 0,
            'start_date': datetime.now().isoformat(),
            'end_date': datetime.now().isoformat()
        })

@app.route('/api/technical-features', methods=['GET'])
def get_technical_features():
    symbol = request.args.get('symbol', 'BTC/USDT')
    timeframe = request.args.get('timeframe', '1d')
    limit = int(request.args.get('limit', 100))
    
    # Query technical features from BigQuery
    query = f"""
    SELECT *
    FROM `{storage.project_id}.{storage.dataset}.technical_features`
    WHERE symbol = '{symbol}' AND timeframe = '{timeframe}'
    ORDER BY timestamp DESC
    LIMIT {limit}
    """
    
    try:
        features_df = storage.client.query(query).to_dataframe()
        
        if features_df.empty:
            return jsonify([])
        
        # Convert to list of dictionaries for JSON response
        result = []
        for _, row in features_df.iterrows():
            feature_dict = {
                'timestamp': row['timestamp'].isoformat(),
                'symbol': row['symbol'],
                'timeframe': row['timeframe']
            }
            
            # Add all technical indicators that exist
            for col in features_df.columns:
                if col not in ['timestamp', 'symbol', 'timeframe'] and not pd.isna(row[col]):
                    feature_dict[col] = float(row[col])
            
            result.append(feature_dict)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error fetching technical features: {e}")
        return jsonify([])

@app.route('/api/news', methods=['GET'])
def get_news():
    hours = int(request.args.get('hours', 24))
    
    # Query recent sentiment data from BigQuery
    news_df = storage.query_recent_sentiment(hours)
    
    if news_df.empty:
        return jsonify([])
    
    # Convert to list of dictionaries for JSON response
    result = []
    for _, row in news_df.iterrows():
        # Create a news item from sentiment data
        news_item = {
            'id': str(row.name),  # Use row index as ID
            'timestamp': row['timestamp'].isoformat() if 'timestamp' in row else None,
            'source': row['source'] if 'source' in row else None,
            'headline': row['headline'] if 'headline' in row else None,
            'snippet': row['content'] if 'content' in row else (row['snippet'] if 'snippet' in row else None),
            'url': row['url'] if 'url' in row else None,
            'sentiment_score': float(row['sentiment_score']) if 'sentiment_score' in row and not pd.isna(row['sentiment_score']) else None,
            'sentiment_label': row['sentiment_label'] if 'sentiment_label' in row else None,
            'related_coins': row['related_coins'] if 'related_coins' in row else None
        }
        
        # Filter out None values to keep the response clean
        news_item = {k: v for k, v in news_item.items() if v is not None}
        result.append(news_item)
    
    return jsonify(result)

@app.route('/api/available-coins', methods=['GET'])
def get_available_coins():
    """Return a list of available coins for data collection"""
    try:
        # You could fetch this from your exchange or a cryptocurrency API
        # For now, we'll return a static list of popular coins
        coins = [
            {"value": "BTC/USDT", "label": "Bitcoin (BTC/USDT)"},
            {"value": "ETH/USDT", "label": "Ethereum (ETH/USDT)"},
            {"value": "SOL/USDT", "label": "Solana (SOL/USDT)"},
            {"value": "XRP/USDT", "label": "Ripple (XRP/USDT)"},
            {"value": "ADA/USDT", "label": "Cardano (ADA/USDT)"},
            {"value": "DOT/USDT", "label": "Polkadot (DOT/USDT)"},
            {"value": "AVAX/USDT", "label": "Avalanche (AVAX/USDT)"},
            {"value": "MATIC/USDT", "label": "Polygon (MATIC/USDT)"},
            {"value": "LINK/USDT", "label": "Chainlink (LINK/USDT)"},
            {"value": "UNI/USDT", "label": "Uniswap (UNI/USDT)"},
            {"value": "DOGE/USDT", "label": "Dogecoin (DOGE/USDT)"},
            {"value": "SHIB/USDT", "label": "Shiba Inu (SHIB/USDT)"},
            {"value": "PEPE/USDT", "label": "Pepe Coin (PEPE/USDT)"},
            {"value": "LTC/USDT", "label": "Litecoin (LTC/USDT)"},
            {"value": "ATOM/USDT", "label": "Cosmos (ATOM/USDT)"},
            {"value": "NEAR/USDT", "label": "NEAR Protocol (NEAR/USDT)"},
            {"value": "FTM/USDT", "label": "Fantom (FTM/USDT)"},
            {"value": "ALGO/USDT", "label": "Algorand (ALGO/USDT)"},
            {"value": "FIL/USDT", "label": "Filecoin (FIL/USDT)"},
            {"value": "AAVE/USDT", "label": "Aave (AAVE/USDT)"},
            {"value": "EGLD/USDT", "label": "Elrond (EGLD/USDT)"}
        ]
        return jsonify(coins)
    except Exception as e:
        logger.error(f"Error fetching available coins: {e}")
        return jsonify([])

@app.route('/api/symbols', methods=['GET'])
def get_symbols():
    # Return the list of supported symbols - now we'll call the available-coins endpoint
    return get_available_coins()

@app.route('/api/collect-data', methods=['POST'])
def collect_data():
    """
    Endpoint to collect data for specific cryptocurrencies.
    This will fetch market data, perform technical analysis, generate signals,
    and optionally collect news data.
    """
    try:
        # Get request data
        data = request.json
        symbols = data.get('symbols', [])  # Now accepting a list of symbols
        timeframe = data.get('timeframe', '1d')
        collect_news = data.get('collect_news', True)
        generate_signals = data.get('generate_signals', True)
        
        logger.info(f"Collecting data for symbols: {symbols}, timeframe: {timeframe}")
        logger.info(f"Collect news: {collect_news}, Generate signals: {generate_signals}")
        
        if not symbols:
            return jsonify({"success": False, "message": "At least one symbol is required"}), 400
        
        # If a single symbol is provided as a string, convert to list
        if isinstance(symbols, str):
            symbols = [symbols]
        
        # Initialize results
        results = {
            "market_data": 0,
            "technical_features": 0,
            "signals": 0,
            "news": 0,
            "processed_symbols": []
        }
        
        # First, if we're collecting news, do it for all symbols at once
        news_data = pd.DataFrame()
        if collect_news:
            try:
                logger.info("Collecting news data first")
                
                # Extract base currencies from symbols (e.g., 'BTC' from 'BTC/USDT')
                base_currencies = [s.split('/')[0] for s in symbols]
                categories = ','.join(base_currencies)
                
                logger.info(f"Fetching news for categories: {categories}")
                
                # Use our imported NewsFetcher
                news_data = news_fetcher.fetch_crypto_news(categories=categories)
                
                if not news_data.empty:
                    logger.info(f"Collected {len(news_data)} news items")
                    
                    # Store news data
                    storage.store_sentiment_data(news_data)
                    results["news"] = len(news_data)
                else:
                    logger.warning("No news data was fetched")
            except Exception as e:
                logger.error(f"Error collecting news data: {e}")
                import traceback
                traceback.print_exc()
        
        # Process each symbol
        for symbol in symbols:
            try:
                logger.info(f"Processing symbol: {symbol}")
                
                # Fetch market data using our imported MarketDataFetcher
                lookback_days = 200 if timeframe == '1d' else (30 if timeframe == '4h' else 7)
                ohlcv_data = market_data_fetcher.fetch_ohlcv(
                    symbol=symbol,
                    timeframe=timeframe,
                    limit=lookback_days * 24  # Convert days to hours for hourly data
                )
                
                if ohlcv_data is None or ohlcv_data.empty:
                    logger.warning(f"Failed to fetch market data for {symbol}, skipping...")
                    continue
                
                logger.info(f"Fetched {len(ohlcv_data)} market data points for {symbol}")
                
                # Store market data in BigQuery
                storage.store_market_data(ohlcv_data, timeframe)
                results["market_data"] += len(ohlcv_data)
                results["processed_symbols"].append(symbol)
                
                # Perform technical analysis
                if generate_signals:
                    logger.info(f"Generating technical analysis for {symbol}")
                    
                    # Use our imported TechnicalAnalyzer
                    analyzed_df = technical_analyzer.analyze(ohlcv_data)
                    
                    # Store technical features
                    storage.store_technical_features(analyzed_df, timeframe)
                    results["technical_features"] += len(analyzed_df)
                    
                    # Generate signals
                    signals = technical_analyzer.detect_trends(analyzed_df)
                    
                    if not signals.empty:
                        logger.info(f"Generated {len(signals)} signals for {symbol}")
                        
                        # If we have news data, combine it with signals
                        if not news_data.empty:
                            logger.info(f"Combining signals with sentiment data")
                            combined_signals = signal_generator.generate_signals(signals, news_data)
                            
                            # Store combined signals
                            storage.store_trading_signals(combined_signals)
                            results["signals"] += len(combined_signals)
                        else:
                            # Store signals without sentiment
                            storage.store_trading_signals(signals)
                            results["signals"] += len(signals)
                    else:
                        logger.warning(f"No signals generated for {symbol}")
            except Exception as e:
                logger.error(f"Error processing {symbol}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        # Prepare success message
        if not results["processed_symbols"]:
            return jsonify({
                "success": False,
                "message": "Failed to process any symbols. Please check logs for details.",
                "results": results
            }), 400
        
        message = f"Successfully collected data for {len(results['processed_symbols'])} symbols. "
        message += f"Stored {results['market_data']} market data points, "
        message += f"{results['technical_features']} technical features, "
        message += f"{results['signals']} trading signals"
        
        if collect_news:
            message += f", and {results['news']} news items."
        else:
            message += "."
        
        logger.info(message)
        
        # Return the processed symbols to update the UI
        return jsonify({
            "success": True,
            "message": message,
            "results": results,
            "processed_symbols": results["processed_symbols"]
        })
        
    except Exception as e:
        logger.error(f"Error collecting data: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/collect-all-data', methods=['POST'])
def collect_all_data():
    """
    Endpoint to collect data for all available cryptocurrencies.
    """
    try:
        # Get request data
        data = request.json
        timeframe = data.get('timeframe', '1d')
        collect_news = data.get('collect_news', True)
        generate_signals = data.get('generate_signals', True)
        
        logger.info(f"Collecting data for all available coins, timeframe: {timeframe}")
        
        # Get all available coins
        coins_response = get_available_coins()
        coins = coins_response.json
        symbols = [coin['value'] for coin in coins]
        
        # Create a new request with all symbols
        new_request = {
            'symbols': symbols,
            'timeframe': timeframe,
            'collect_news': collect_news,
            'generate_signals': generate_signals
        }
        
        # Call the collect-data endpoint with all symbols
        return collect_data()
        
    except Exception as e:
        logger.error(f"Error collecting all data: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/update-trading-signals', methods=['POST'])
def update_trading_signals():
    """
    Endpoint to manually update trading signals with latest sentiment data.
    Useful for refreshing signals without collecting new market data.
    """
    try:
        # Get request data
        data = request.json
        hours = data.get('hours', 24)  # How far back to look for signals
        
        logger.info(f"Updating trading signals with sentiment data from the last {hours} hours")
        
        # Get recent trading signals
        query = f"""
        SELECT *
        FROM `{storage.project_id}.{storage.dataset}.trading_signals`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {hours} HOUR)
        ORDER BY timestamp DESC
        """
        
        signals_df = storage.client.query(query).to_dataframe()
        
        if signals_df.empty:
            return jsonify({
                "success": False,
                "message": "No recent trading signals found to update."
            }), 404
        
        # Get recent news/sentiment data
        news_data = news_fetcher.fetch_crypto_news()
        
        if news_data.empty:
            return jsonify({
                "success": False,
                "message": "Failed to fetch news data for sentiment analysis."
            }), 500
        
        # Update signals with sentiment
        combined_signals = signal_generator.generate_signals(signals_df, news_data)
        
        # Store updated signals
        if hasattr(storage, 'update_trading_signals'):
            storage.update_trading_signals(combined_signals)
        else:
            storage.store_trading_signals(combined_signals)
        
        return jsonify({
            "success": True,
            "message": f"Successfully updated {len(combined_signals)} trading signals with sentiment data."
        })
        
    except Exception as e:
        logger.error(f"Error updating trading signals: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/collected-coins', methods=['GET'])
def get_collected_coins():
    """
    Get a list of coins for which data has been collected
    
    Returns:
        JSON array of coin symbols
    """
    try:
        # Query distinct symbols from market_data table
        query = f"""
        SELECT DISTINCT symbol
        FROM `{storage.project_id}.{storage.dataset}.market_data`
        ORDER BY symbol
        """
        
        df = storage.client.query(query).to_dataframe()
        
        if df.empty:
            # Return default coins if no data has been collected yet
            default_coins = [
                "BTC/USDT", "ETH/USDT", "SOL/USDT", "XRP/USDT", 
                "ADA/USDT", "DOGE/USDT", "SHIB/USDT", "PEPE/USDT", "MATIC/USDT"
            ]
            return jsonify(default_coins)
        
        # Extract symbols as a list
        symbols = df['symbol'].tolist()
        
        # Log the symbols for debugging
        logger.info(f"Found collected coins: {symbols}")
        
        return jsonify(symbols)
    except Exception as e:
        logger.error(f"Error fetching collected coins: {e}")
        # Return default coins on error
        default_coins = [
            "BTC/USDT", "ETH/USDT", "SOL/USDT", "XRP/USDT", 
            "ADA/USDT", "DOGE/USDT", "SHIB/USDT", "PEPE/USDT", "MATIC/USDT"
        ]
        return jsonify(default_coins)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
