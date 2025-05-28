import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import uuid

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SignalGenerator:
    def __init__(self):
        pass
    
    def generate_signals(self, technical_signals, news_data):
        """
        Combine technical signals with sentiment data to generate final trading signals
        
        Args:
            technical_signals: DataFrame with technical signals
            news_data: DataFrame with news and sentiment data
            
        Returns:
            DataFrame with combined signals
        """
        if technical_signals.empty:
            logger.warning("No technical signals to combine with sentiment")
            return pd.DataFrame()
        
        # Make a copy to avoid modifying the original
        result = technical_signals.copy()
        
        # Initialize sentiment scores
        result['sentiment_score'] = 0.0
        
        # Add new fields for enhanced trading signals
        result['take_profit'] = None
        result['stop_loss'] = None
        result['pattern'] = None
        result['trade_status'] = None
        result['expiry_time'] = None
        
        # Log the signals before sentiment
        logger.info(f"Technical signals before sentiment: {result[['symbol', 'signal', 'confidence']].head(3)}")
        
        # If we have news data, calculate sentiment for each symbol
        if not news_data.empty:
            logger.info(f"Combining {len(technical_signals)} signals with {len(news_data)} news items")
            
            # Log the first few news items for debugging
            if len(news_data) > 0:
                logger.info(f"Sample news data: {news_data[['headline', 'sentiment_score', 'related_coins']].head(3).to_dict('records')}")
            
            # Create a dictionary to store sentiment scores by currency
            sentiment_by_currency = {}
            
            # Calculate average sentiment for each currency
            for _, news in news_data.iterrows():
                if 'related_coins' in news and news['related_coins'] and 'sentiment_score' in news:
                    coins = news['related_coins'].split(',')
                    for coin in coins:
                        coin = coin.strip().upper()
                        if coin not in sentiment_by_currency:
                            sentiment_by_currency[coin] = []
                        
                        # Add the sentiment score to the list for this currency
                        sentiment_by_currency[coin].append(news['sentiment_score'])
            
            # Calculate average sentiment for each currency
            avg_sentiment_by_currency = {}
            for coin, scores in sentiment_by_currency.items():
                avg_sentiment_by_currency[coin] = sum(scores) / len(scores)
                logger.info(f"Average sentiment for {coin}: {avg_sentiment_by_currency[coin]}")
            
            # Apply sentiment to signals
            for idx, signal in result.iterrows():
                symbol = signal['symbol']
                base_currency = symbol.split('/')[0] if '/' in symbol else symbol
                base_currency = base_currency.upper()
                
                # Check if we have sentiment for this currency
                if base_currency in avg_sentiment_by_currency:
                    avg_sentiment = avg_sentiment_by_currency[base_currency]
                    
                    # Set the sentiment score
                    result.at[idx, 'sentiment_score'] = avg_sentiment
                    
                    # Adjust confidence based on sentiment
                    # If sentiment agrees with signal, boost confidence
                    if (signal['signal'] == 'BUY' and avg_sentiment > 0) or \
                       (signal['signal'] == 'SELL' and avg_sentiment < 0):
                        result.at[idx, 'confidence'] = min(0.95, signal['confidence'] + abs(avg_sentiment) * 0.2)
                    # If sentiment disagrees with signal, reduce confidence
                    elif (signal['signal'] == 'BUY' and avg_sentiment < 0) or \
                         (signal['signal'] == 'SELL' and avg_sentiment > 0):
                        result.at[idx, 'confidence'] = max(0.05, signal['confidence'] - abs(avg_sentiment) * 0.2)
                    
                    # Add sentiment to indicators
                    sentiment_indicator = f"Sentiment: {avg_sentiment:.2f}"
                    if 'indicators' in signal and signal['indicators']:
                        result.at[idx, 'indicators'] = f"{signal['indicators']}, {sentiment_indicator}"
                    else:
                        result.at[idx, 'indicators'] = sentiment_indicator
                    
                    logger.info(f"Applied sentiment {avg_sentiment:.2f} to {symbol}, new confidence: {result.at[idx, 'confidence']:.2f}")
                else:
                    logger.info(f"No sentiment data found for {base_currency}")
        else:
            logger.warning("No news data available for sentiment analysis")
        
        # Add take profit and stop loss levels based on price and signal type
        for idx, signal in result.iterrows():
            price = signal['price']
            if pd.isna(price) or price == 0:
                continue
                
            # Calculate take profit and stop loss based on volatility or fixed percentage
            # For simplicity, we'll use fixed percentages here
            if signal['signal'] == 'BUY':
                # For buy signals: TP is higher, SL is lower
                result.at[idx, 'take_profit'] = price * 1.05  # 5% profit target
                result.at[idx, 'stop_loss'] = price * 0.97    # 3% stop loss
            else:  # SELL signal
                # For sell signals: TP is lower, SL is higher
                result.at[idx, 'take_profit'] = price * 0.95  # 5% profit target
                result.at[idx, 'stop_loss'] = price * 1.03    # 3% stop loss
            
            # Add candlestick pattern information
            patterns = [
                "Bullish Engulfing", "Bearish Engulfing", "Hammer", "Shooting Star",
                "Doji", "Morning Star", "Evening Star", "Harami", "Piercing Line",
                "Dark Cloud Cover", "Three White Soldiers", "Three Black Crows"
            ]
            
            # Randomly assign a pattern for demonstration purposes
            # In a real system, this would be determined by actual pattern detection
            if signal['signal'] == 'BUY':
                bullish_patterns = ["Bullish Engulfing", "Hammer", "Morning Star", "Three White Soldiers", "Piercing Line"]
                result.at[idx, 'pattern'] = np.random.choice(bullish_patterns)
            else:
                bearish_patterns = ["Bearish Engulfing", "Shooting Star", "Evening Star", "Three Black Crows", "Dark Cloud Cover"]
                result.at[idx, 'pattern'] = np.random.choice(bearish_patterns)
            
            # Set trade status and expiry time
            # For demonstration, we'll randomly assign statuses
            # In a real system, this would be based on time elapsed since signal generation
            statuses = ["Active", "Pending", "Expired"]
            weights = [0.7, 0.2, 0.1]  # 70% active, 20% pending, 10% expired
            result.at[idx, 'trade_status'] = np.random.choice(statuses, p=weights)
            
            # Set expiry time (24 hours from signal generation)
            signal_time = pd.to_datetime(signal['timestamp'])
            result.at[idx, 'expiry_time'] = (signal_time + timedelta(hours=24)).isoformat()
        
        # Log the signals after sentiment
        logger.info(f"Signals after sentiment: {result[['symbol', 'signal', 'sentiment_score', 'confidence']].head(3)}")
        
        return result
