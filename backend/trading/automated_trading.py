import os
import ccxt
import pandas as pd
import logging
import uuid
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AutomatedTrader:
    def __init__(self, exchange_id='binance', paper_trading=True):
        """
        Initialize the automated trader.
        
        Args:
            exchange_id: The exchange to use (default: binance)
            paper_trading: Whether to use paper trading or real trading (default: True)
        """
        self.exchange_id = exchange_id
        self.paper_trading = paper_trading
        self.exchange = self._initialize_exchange()
        self.trade_amount_usd = float(os.getenv('TRADE_AMOUNT_USD', 100))
        self.trades = []
        
    def _initialize_exchange(self):
        """Initialize the CCXT exchange object."""
        try:
            exchange_class = getattr(ccxt, self.exchange_id)
            exchange = exchange_class({
                'apiKey': os.getenv('EXCHANGE_API_KEY'),
                'secret': os.getenv('EXCHANGE_SECRET_KEY'),
                'enableRateLimit': True,
            })
            
            if not self.paper_trading:
                # Verify connection and authentication for real trading
                exchange.load_markets()
                exchange.fetch_balance()
                logger.info(f"Successfully authenticated with {self.exchange_id}")
            else:
                logger.info(f"Initialized paper trading mode with {self.exchange_id}")
                
            return exchange
        except Exception as e:
            logger.error(f"Failed to initialize exchange: {e}")
            raise
    
    def execute_signals(self, signals):
        """
        Execute trading signals.
        
        Args:
            signals: DataFrame with trading signals
            
        Returns:
            DataFrame with executed transactions
        """
        if signals.empty:
            logger.info("No signals to execute")
            return pd.DataFrame()
        
        transactions = []
        
        for _, signal in signals.iterrows():
            if signal['signal'] in ['BUY', 'SELL']:
                try:
                    transaction = self._execute_trade(
                        symbol=signal['symbol'],
                        side=signal['signal'].lower(),
                        price=signal['close'],
                        confidence=signal.get('confidence', 0.5)
                    )
                    
                    if transaction:
                        transaction['signal_id'] = str(uuid.uuid4())
                        transactions.append(transaction)
                        
                except Exception as e:
                    logger.error(f"Error executing {signal['signal']} for {signal['symbol']}: {e}")
        
        return pd.DataFrame(transactions) if transactions else pd.DataFrame()
    
    def _execute_trade(self, symbol, side, price, confidence=0.5):
        """Execute a single trade."""
        if not os.getenv('TRADING_ENABLED', 'False').lower() in ['true', '1', 'yes'] and not self.paper_trading:
            logger.info(f"Trading disabled. Would have executed: {side} {symbol} at {price}")
            return None
        
        # Adjust trade amount based on confidence
        adjusted_amount = self.trade_amount_usd * confidence
        
        # Calculate amount to buy/sell
        amount = adjusted_amount / price
        
        if self.paper_trading:
            # Paper trading - simulate order
            fee = adjusted_amount * 0.001  # Simulated 0.1% fee
            
            transaction = {
                'timestamp': datetime.now(),
                'symbol': symbol,
                'type': side.upper(),
                'price': price,
                'amount': amount,
                'cost': adjusted_amount,
                'fee': fee,
                'paper_trading': True
            }
            
            logger.info(f"[PAPER] Executed {side} {amount:.6f} {symbol} at {price} (${adjusted_amount:.2f})")
            self.trades.append(transaction)
            return transaction
        else:
            # Real trading
            try:
                if side == 'buy':
                    order = self.exchange.create_market_buy_order(symbol, amount)
                else:
                    order = self.exchange.create_market_sell_order(symbol, amount)
                
                logger.info(f"Executed {side} {amount:.6f} {symbol} at ~{price}")
                
                # Extract order details
                transaction = {
                    'timestamp': datetime.now(),
                    'symbol': symbol,
                    'type': side.upper(),
                    'price': order['price'] if 'price' in order else price,
                    'amount': order['amount'],
                    'cost': order['cost'],
                    'fee': order['fee']['cost'] if 'fee' in order and 'cost' in order['fee'] else None,
                    'order_id': order['id']
                }
                
                self.trades.append(transaction)
                return transaction
                
            except Exception as e:
                logger.error(f"Error executing real trade: {e}")
                return None
    
    def get_trade_history(self):
        """Get the trading history."""
        return pd.DataFrame(self.trades) if self.trades else pd.DataFrame()

if __name__ == "__main__":
    # Test the automated trader with sample signals
    from dotenv import load_dotenv
    load_dotenv()
    
    # Create sample signals
    signals_data = {
        'symbol': ['BTC/USDT', 'ETH/USDT'],
        'timestamp': [datetime.now()] * 2,
        'close': [50000, 3000],
        'signal': ['BUY', 'SELL'],
        'confidence': [0.8, 0.7]
    }
    
    signals = pd.DataFrame(signals_data)
    
    # Initialize trader and execute signals
    trader = AutomatedTrader(paper_trading=True)
    transactions = trader.execute_signals(signals)
    
    print("Executed Transactions:")
    print(transactions)