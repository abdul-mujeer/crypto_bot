import pandas as pd
import numpy as np
import talib
from datetime import datetime

class TechnicalAnalyzer:
    def __init__(self):
        pass
    
    def analyze(self, df):
        """
        Analyze OHLCV data and calculate technical indicators
        
        Args:
            df: DataFrame with OHLCV data
            
        Returns:
            DataFrame with technical indicators
        """
        if df.empty:
            return pd.DataFrame()
        
        # Make a copy to avoid modifying the original
        result = df.copy()
        
        # Calculate RSI
        result['rsi_14'] = talib.RSI(result['close'], timeperiod=14)
        
        # Calculate MACD
        macd, macd_signal, macd_hist = talib.MACD(
            result['close'], 
            fastperiod=12, 
            slowperiod=26, 
            signalperiod=9
        )
        result['macd'] = macd
        result['macd_signal'] = macd_signal
        result['macd_hist'] = macd_hist
        
        # Replace NaN values with None for JSON compatibility
        result = result.replace({np.nan: None})
        
        # Calculate Moving Averages
        result['sma_20'] = talib.SMA(result['close'], timeperiod=20)
        result['sma_50'] = talib.SMA(result['close'], timeperiod=50)
        result['sma_200'] = talib.SMA(result['close'], timeperiod=200)
        result['ema_12'] = talib.EMA(result['close'], timeperiod=12)
        result['ema_26'] = talib.EMA(result['close'], timeperiod=26)
        
        # Calculate Bollinger Bands
        upper, middle, lower = talib.BBANDS(
            result['close'], 
            timeperiod=20, 
            nbdevup=2, 
            nbdevdn=2, 
            matype=0
        )
        result['bb_upper'] = upper
        result['bb_middle'] = middle
        result['bb_lower'] = lower
        result['bb_width'] = (upper - lower) / middle
        
        # Calculate Stochastic Oscillator
        result['stoch_k'], result['stoch_d'] = talib.STOCH(
            result['high'], 
            result['low'], 
            result['close'], 
            fastk_period=14, 
            slowk_period=3, 
            slowk_matype=0, 
            slowd_period=3, 
            slowd_matype=0
        )
        
        # Calculate ADX
        result['adx'] = talib.ADX(result['high'], result['low'], result['close'], timeperiod=14)
        
        # Calculate ATR
        result['atr'] = talib.ATR(result['high'], result['low'], result['close'], timeperiod=14)
        
        # Calculate OBV
        result['obv'] = talib.OBV(result['close'], result['volume'])
        
        # Replace any remaining NaN values with None for JSON compatibility
        result = result.replace({np.nan: None})
        
        return result
    
    def detect_trends(self, df):
        """
        Detect trends and generate trading signals
        
        Args:
            df: DataFrame with technical indicators
            
        Returns:
            DataFrame with trading signals
        """
        if df.empty or len(df) < 20:
            return pd.DataFrame()
        
        # Get the most recent data point
        latest = df.iloc[-1]
        symbol = latest['symbol'] if 'symbol' in latest else 'Unknown'
        
        # Initialize signals list
        signals = []
        
        # Check for buy signals
        buy_signals = []
        
        # RSI oversold
        if latest['rsi_14'] is not None and latest['rsi_14'] < 30:
            buy_signals.append('RSI Oversold')
        
        # MACD crossover
        if (df['macd_hist'].iloc[-2] is not None and latest['macd_hist'] is not None and
            df['macd_hist'].iloc[-2] < 0 and latest['macd_hist'] > 0):
            buy_signals.append('MACD Bullish Crossover')
        
        # Price above SMA 20
        if latest['close'] is not None and latest['sma_20'] is not None and latest['close'] > latest['sma_20']:
            buy_signals.append('Price > SMA20')
        
        # Bollinger Band bounce
        if (df['close'].iloc[-2] is not None and df['bb_lower'].iloc[-2] is not None and
            latest['close'] is not None and latest['bb_lower'] is not None and
            df['close'].iloc[-2] < df['bb_lower'].iloc[-2] and latest['close'] > latest['bb_lower']):
            buy_signals.append('BB Bounce')
        
        # Stochastic oversold
        if (df['stoch_k'].iloc[-2] is not None and latest['stoch_k'] is not None and
            df['stoch_k'].iloc[-2] < 20 and latest['stoch_k'] > 20):
            buy_signals.append('Stochastic Bullish Crossover')
        
        # Volume spike (especially important for smaller coins like SHIB and MATIC)
        if latest['volume'] is not None and df['volume'].iloc[-20:].mean() is not None and latest['volume'] > df['volume'].iloc[-20:].mean() * 1.5:
            buy_signals.append('Volume Spike')
        
        # Check for sell signals
        sell_signals = []
        
        # RSI overbought
        if latest['rsi_14'] is not None and latest['rsi_14'] > 70:
            sell_signals.append('RSI Overbought')
        
        # MACD crossover
        if (df['macd_hist'].iloc[-2] is not None and latest['macd_hist'] is not None and
            df['macd_hist'].iloc[-2] > 0 and latest['macd_hist'] < 0):
            sell_signals.append('MACD Bearish Crossover')
        
        # Price below SMA 20
        if latest['close'] is not None and latest['sma_20'] is not None and latest['close'] < latest['sma_20']:
            sell_signals.append('Price < SMA20')
        
        # Bollinger Band squeeze
        if latest['close'] is not None and latest['bb_upper'] is not None and latest['close'] > latest['bb_upper']:
            sell_signals.append('BB Upper Breach')
        
        # Stochastic overbought
        if (df['stoch_k'].iloc[-2] is not None and latest['stoch_k'] is not None and
            df['stoch_k'].iloc[-2] > 80 and latest['stoch_k'] < 80):
            sell_signals.append('Stochastic Bearish Crossover')
        
        # Determine signal based on the number of buy vs sell signals
        signal = None
        technical_score = 0
        
        # For smaller coins like SHIB and MATIC, we'll be more sensitive to signals
        is_small_cap = 'SHIB' in symbol or 'MATIC' in symbol
        
        if len(buy_signals) > len(sell_signals) or (is_small_cap and len(buy_signals) >= len(sell_signals) and len(buy_signals) > 0):
            signal = 'BUY'
            technical_score = min(4.0, 2.0 + (len(buy_signals) - len(sell_signals)) * 0.5)
            if is_small_cap:
                technical_score = min(4.0, technical_score + 0.5)  # Boost score for small caps
        elif len(sell_signals) > len(buy_signals):
            signal = 'SELL'
            technical_score = min(4.0, 2.0 + (len(sell_signals) - len(buy_signals)) * 0.5)
        else:
            # If equal, check the trend
            if latest['close'] is not None and latest['sma_50'] is not None and latest['close'] > latest['sma_50']:
                signal = 'BUY'
                technical_score = 2.0
            else:
                signal = 'SELL'
                technical_score = 2.0
        
        # Create signal record
        indicators = ', '.join(buy_signals + sell_signals)
        
        signals.append({
            'timestamp': latest['timestamp'] if 'timestamp' in latest else datetime.now(),
            'symbol': symbol,
            'signal': signal,
            'price': latest['close'],
            'technical_score': technical_score,
            'indicators': indicators,
            # Add these fields to match the BigQuery schema
            'sentiment_score': 0.0,  # Default value, will be updated later
            'confidence': technical_score / 4.0  # Calculate confidence based on technical score
        })
        
        # Convert to DataFrame
        signals_df = pd.DataFrame(signals)
        
        return signals_df
