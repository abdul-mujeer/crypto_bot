import os
import logging
import time
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
# Import our modules
from data.market_data import MarketDataFetcher
from data.news_data import NewsFetcher
from data.bigquery_storage import BigQueryStorage
from analysis.technical_analysis import TechnicalAnalyzer
from analysis.signal_generator import SignalGenerator
from trading.automated_trading import AutomatedTrader
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('crypto_trader.log')
    ]
)
logger = logging.getLogger(__name__)
class CryptoTradingSystem:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        
        # Initialize components
        self.market_data = MarketDataFetcher()
        self.news_fetcher = NewsFetcher()
        self.storage = BigQueryStorage()
        self.analyzer = TechnicalAnalyzer()
        self.signal_generator = SignalGenerator()
        self.trader = AutomatedTrader(paper_trading=True)
        
        self.symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT']
        self.timeframes = ['1h', '4h', '1d']
        
        # Recreate technical features table to ensure correct schema
        self.storage.recreate_technical_features_table()
        
    def run(self, fetch_interval_minutes=60):
        """
        Run the trading system continuously.
        
        Args:
            fetch_interval_minutes: Interval between data fetches in minutes
        """
        logger.info("Starting Crypto Trading System")
        
        while True:
            try:
                self.process_cycle()
                
                # Wait for the next interval
                logger.info(f"Waiting for {fetch_interval_minutes} minutes until next cycle")
                time.sleep(fetch_interval_minutes * 60)
                
            except KeyboardInterrupt:
                logger.info("Keyboard interrupt received, shutting down")
                break
                
            except Exception as e:
                logger.error(f"Error in main processing cycle: {e}")
                # Wait a bit before retrying
                time.sleep(300)
    
    def process_cycle(self):
        """Process a single trading cycle."""
        cycle_start = datetime.now()
        logger.info(f"Starting processing cycle at {cycle_start}")
        
        # 1. Fetch market data
        market_data = self._fetch_all_market_data()
        if market_data:
            logger.info(f"Fetched market data for {len(market_data)} symbol-timeframe combinations")
            
            # Store market data
            for timeframe, df in market_data.items():
                self.storage.store_market_data(df, timeframe)
        else:
            logger.warning("Failed to fetch market data")
        
        # 2. Fetch news and perform sentiment analysis
        sentiment_df = self.news_fetcher.fetch_crypto_news()
        if not sentiment_df.empty:
            logger.info(f"Fetched and analyzed {len(sentiment_df)} news articles")
            
            # Store sentiment data
            self.storage.store_sentiment_data(sentiment_df)
        else:
            logger.warning("No news articles fetched or sentiment analysis failed")
        
        # 3. Perform technical analysis
        technical_signals = self._perform_technical_analysis(market_data)
        if technical_signals is not None and not isinstance(technical_signals, pd.DataFrame):
            logger.warning("Technical analysis did not return a valid DataFrame")
        elif technical_signals is not None and not technical_signals.empty:
            logger.info(f"Generated technical signals for {len(technical_signals)} symbols")
            
            # 4. Generate combined signals
            combined_signals = self.signal_generator.generate_signals(technical_signals, sentiment_df)
            if not combined_signals.empty:
                logger.info(f"Generated {len(combined_signals)} trading signals")
                
                # Store signals
                self.storage.store_trading_signals(combined_signals)
                
                # 5. Execute trades based on signals
                transactions = self.trader.execute_signals(combined_signals)
                if not transactions.empty:
                    logger.info(f"Executed {len(transactions)} trades")
                    
                    # Store transactions
                    self.storage.store_transactions(transactions)
                else:
                    logger.info("No trades were executed")
            else:
                logger.warning("No trading signals were generated")
        else:
            logger.warning("Failed to generate technical signals")
        
        cycle_end = datetime.now()
        duration = (cycle_end - cycle_start).total_seconds()
        logger.info(f"Processing cycle completed in {duration:.2f} seconds")
    
    def _fetch_all_market_data(self):
        """Fetch market data for all configured symbols and timeframes."""
        results = {}
        
        for timeframe in self.timeframes:
            try:
                # Determine lookback period based on timeframe
                if timeframe == '1h':
                    lookback_days = 7
                elif timeframe == '4h':
                    lookback_days = 30
                else:  # '1d'
                    lookback_days = 200
                
                # Fetch data for all symbols with this timeframe
                df = self.market_data.fetch_all_ohlcv(
                    timeframe=timeframe,
                    limit=lookback_days * 24  # Convert days to hours for hourly data
                )
                
                if not df.empty:
                    results[timeframe] = df
                    
            except Exception as e:
                logger.error(f"Error fetching market data for timeframe {timeframe}: {e}")
        
        return results
    
    def _perform_technical_analysis(self, market_data):
        """Perform technical analysis on market data."""
        if not market_data:
            return None
        
        # Use the daily timeframe for signal generation if available
        timeframe = '1d' if '1d' in market_data else list(market_data.keys())[0]
        df = market_data[timeframe]
        
        # Group by symbol and perform analysis
        symbols = df['symbol'].unique()
        all_signals = []
        all_technical_features = []
        
        for symbol in symbols:
            try:
                symbol_df = df[df['symbol'] == symbol].copy()
                
                # Perform technical analysis
                analyzed_df = self.analyzer.analyze(symbol_df)
                
                # Store only the most recent technical features (to avoid storing too much data)
                recent_features = analyzed_df.tail(10).copy()  # Store last 10 data points
                
                # Add to collection for batch storage
                all_technical_features.append(recent_features)
                
                # Detect trends and generate signals
                signals = self.analyzer.detect_trends(analyzed_df)
                
                if not signals.empty:
                    all_signals.append(signals)
                    
            except Exception as e:
                logger.error(f"Error analyzing {symbol}: {e}")
        
        # Store all technical features in one batch
        if all_technical_features:
            try:
                combined_features = pd.concat(all_technical_features, ignore_index=True)
                self.storage.store_technical_features(combined_features, timeframe)
                logger.info(f"Stored technical features for {len(all_technical_features)} symbols")
            except Exception as e:
                logger.error(f"Error storing technical features: {e}")
        
        # Combine all signals
        if all_signals:
            return pd.concat(all_signals, ignore_index=True)
        else:
            return None

    def backtest(self, start_date, end_date):
        """
        Run a backtest of the trading strategy over a specific time period.
        
        Args:
            start_date: Start date for backtesting
            end_date: End date for backtesting
            
        Returns:
            DataFrame with backtest results
        """
        logger.info(f"Starting backtest from {start_date} to {end_date}")
        
        # Fetch historical data
        historical_data = {}
        for timeframe in self.timeframes:
            try:
                df = self.storage.get_historical_market_data(
                    symbols=self.symbols,
                    timeframe=timeframe,
                    start_date=start_date,
                    end_date=end_date
                )
                
                if not df.empty:
                    historical_data[timeframe] = df
                    
            except Exception as e:
                logger.error(f"Error fetching historical data for timeframe {timeframe}: {e}")
        
        if not historical_data:
            logger.error("No historical data available for backtesting")
            return pd.DataFrame()
        
        # Initialize backtest results
        backtest_results = []
        
        # Process data day by day
        current_date = pd.to_datetime(start_date)
        end = pd.to_datetime(end_date)
        
        while current_date <= end:
            try:
                # Get data up to current date
                date_data = {}
                for timeframe, df in historical_data.items():
                    date_data[timeframe] = df[df['timestamp'] <= current_date].copy()
                
                # Perform technical analysis
                technical_signals = self._perform_technical_analysis(date_data)
                
                if technical_signals is not None and not technical_signals.empty:
                    # Get historical sentiment data
                    sentiment_df = self.storage.get_historical_sentiment_data(
                        start_date=current_date - timedelta(days=7),
                        end_date=current_date
                    )
                    
                    # Generate signals
                    signals = self.signal_generator.generate_signals(technical_signals, sentiment_df)
                    
                    if not signals.empty:
                        # Record backtest signals
                        for _, signal in signals.iterrows():
                            backtest_results.append({
                                'date': current_date,
                                'symbol': signal['symbol'],
                                'price': signal['close'],
                                'signal': signal['signal'],
                                'confidence': signal.get('confidence', 0),
                                'indicators': signal.get('indicators', '')
                            })
            
            except Exception as e:
                logger.error(f"Error in backtest for date {current_date}: {e}")
            
            # Move to next day
            current_date += timedelta(days=1)
        
        logger.info(f"Backtest completed with {len(backtest_results)} signals")
        return pd.DataFrame(backtest_results)

    def performance_report(self):
        """Generate a performance report for the trading system."""
        try:
            # Get transaction history
            transactions = self.storage.get_all_transactions()
            
            if transactions.empty:
                logger.warning("No transactions found for performance report")
                return pd.DataFrame()
            
            # Calculate metrics
            report = {
                'total_trades': len(transactions),
                'buy_trades': len(transactions[transactions['type'] == 'BUY']),
                'sell_trades': len(transactions[transactions['type'] == 'SELL']),
                'total_volume_usd': transactions['cost'].sum(),
                'avg_trade_size_usd': transactions['cost'].mean(),
                'start_date': transactions['timestamp'].min(),
                'end_date': transactions['timestamp'].max()
            }
            
            # Calculate profit/loss if possible
            # This is simplified and would need to be expanded in a real system
            
            return pd.DataFrame([report])
            
        except Exception as e:
            logger.error(f"Error generating performance report: {e}")
            return pd.DataFrame()

if __name__ == "__main__":
    # Parse command line arguments
    import argparse
    
    parser = argparse.ArgumentParser(description='Crypto Trading System')
    parser.add_argument('--backtest', action='store_true', help='Run in backtest mode')
    parser.add_argument('--start', type=str, help='Start date for backtest (YYYY-MM-DD)')
    parser.add_argument('--end', type=str, help='End date for backtest (YYYY-MM-DD)')
    parser.add_argument('--interval', type=int, default=60, help='Fetch interval in minutes')
    
    args = parser.parse_args()
    
    # Initialize system
    system = CryptoTradingSystem()
    
    if args.backtest:
        if not args.start or not args.end:
            logger.error("Start and end dates are required for backtesting")
        else:
            results = system.backtest(args.start, args.end)
            if not results.empty:
                print(results)
                # Save backtest results
                results.to_csv(f"backtest_{args.start}_to_{args.end}.csv", index=False)
    else:
        # Run the live trading system
        system.run(fetch_interval_minutes=args.interval)

