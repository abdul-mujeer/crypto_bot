import os
import pandas as pd
from google.cloud import bigquery
from datetime import datetime, timedelta
import logging
import json
import tempfile
import numpy as np

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Custom JSON encoder to handle timestamps and NaN values
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (pd.Timestamp, datetime)):
            return obj.isoformat()
        elif pd.isna(obj):
            return None
        return super().default(obj)

class BigQueryStorage:
    def __init__(self):
        # Initialize BigQuery client
        self.client = bigquery.Client()
        
        # Set project and dataset
        self.project_id = os.getenv('GOOGLE_CLOUD_PROJECT', 'aicryptobot-454317')
        self.dataset = os.getenv('BIGQUERY_DATASET', 'CryptoCurrency')
        
        # Create dataset if it doesn't exist
        self._create_dataset()
        
        # Create tables if they don't exist
        self._create_market_data_table()
        self._create_sentiment_data_table()
        self._create_trading_signals_table()
        self._create_transactions_table()
        self._create_technical_features_table()
    
    def _create_dataset(self):
        """Create the dataset if it doesn't exist"""
        dataset_id = f"{self.project_id}.{self.dataset}"
        dataset = bigquery.Dataset(dataset_id)
        dataset.location = "US"
        
        try:
            self.client.get_dataset(dataset_id)
            logger.info(f"Dataset {dataset_id} already exists")
        except Exception:
            # Dataset doesn't exist, create it
            dataset = self.client.create_dataset(dataset, timeout=30)
            logger.info(f"Created dataset {dataset_id}")
    
    def _create_market_data_table(self):
        """Create the market_data table if it doesn't exist"""
        table_id = f"{self.project_id}.{self.dataset}.market_data"
        
        schema = [
            bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED"),
            bigquery.SchemaField("symbol", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("timeframe", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("open", "FLOAT", mode="REQUIRED"),
            bigquery.SchemaField("high", "FLOAT", mode="REQUIRED"),
            bigquery.SchemaField("low", "FLOAT", mode="REQUIRED"),
            bigquery.SchemaField("close", "FLOAT", mode="REQUIRED"),
            bigquery.SchemaField("volume", "FLOAT", mode="REQUIRED")
        ]
        
        try:
            self.client.get_table(table_id)
            logger.info(f"Table {table_id} already exists")
        except Exception:
            # Table doesn't exist, create it
            table = bigquery.Table(table_id, schema=schema)
            table = self.client.create_table(table)
            logger.info(f"Created table {table_id}")
    
    def _create_sentiment_data_table(self):
        """Create the sentiment_data table if it doesn't exist"""
        table_id = f"{self.project_id}.{self.dataset}.sentiment_data"
        
        schema = [
            bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED"),
            bigquery.SchemaField("source", "STRING"),
            bigquery.SchemaField("headline", "STRING"),
            bigquery.SchemaField("snippet", "STRING"),
            bigquery.SchemaField("url", "STRING"),
            bigquery.SchemaField("sentiment_score", "FLOAT"),
            bigquery.SchemaField("sentiment_label", "STRING"),
            bigquery.SchemaField("related_coins", "STRING")
        ]
        
        try:
            self.client.get_table(table_id)
            logger.info(f"Table {table_id} already exists")
        except Exception:
            # Table doesn't exist, create it
            table = bigquery.Table(table_id, schema=schema)
            table = self.client.create_table(table)
            logger.info(f"Created table {table_id}")
    
    def _create_trading_signals_table(self):
        """Create the trading_signals table if it doesn't exist"""
        table_id = f"{self.project_id}.{self.dataset}.trading_signals"
        
        schema = [
            bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED"),
            bigquery.SchemaField("symbol", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("signal", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("price", "FLOAT"),
            bigquery.SchemaField("technical_score", "FLOAT"),
            bigquery.SchemaField("sentiment_score", "FLOAT"),
            bigquery.SchemaField("confidence", "FLOAT"),
            bigquery.SchemaField("indicators", "STRING")
        ]
        
        try:
            self.client.get_table(table_id)
            logger.info(f"Table {table_id} already exists")
        except Exception:
            # Table doesn't exist, create it
            table = bigquery.Table(table_id, schema=schema)
            table = self.client.create_table(table)
            logger.info(f"Created table {table_id}")
    
    def _create_transactions_table(self):
        """Create the transactions table if it doesn't exist"""
        table_id = f"{self.project_id}.{self.dataset}.transactions"
        
        schema = [
            bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED"),
            bigquery.SchemaField("symbol", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("type", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("price", "FLOAT"),
            bigquery.SchemaField("amount", "FLOAT"),
            bigquery.SchemaField("cost", "FLOAT"),
            bigquery.SchemaField("fee", "FLOAT"),
            bigquery.SchemaField("signal_id", "STRING")
        ]
        
        try:
            self.client.get_table(table_id)
            logger.info(f"Table {table_id} already exists")
        except Exception:
            # Table doesn't exist, create it
            table = bigquery.Table(table_id, schema=schema)
            table = self.client.create_table(table)
            logger.info(f"Created table {table_id}")
    
    def _create_technical_features_table(self):
        """Create the technical_features table if it doesn't exist"""
        table_id = f"{self.project_id}.{self.dataset}.technical_features"
        
        schema = [
            bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED"),
            bigquery.SchemaField("symbol", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("timeframe", "STRING", mode="REQUIRED"),
            # Technical indicators
            bigquery.SchemaField("rsi_14", "FLOAT"),
            bigquery.SchemaField("macd", "FLOAT"),
            bigquery.SchemaField("macd_signal", "FLOAT"),
            bigquery.SchemaField("macd_hist", "FLOAT"),
            bigquery.SchemaField("sma_20", "FLOAT"),
            bigquery.SchemaField("sma_50", "FLOAT"),
            bigquery.SchemaField("sma_200", "FLOAT"),
            bigquery.SchemaField("ema_12", "FLOAT"),
            bigquery.SchemaField("ema_26", "FLOAT"),
            bigquery.SchemaField("bb_upper", "FLOAT"),
            bigquery.SchemaField("bb_middle", "FLOAT"),
            bigquery.SchemaField("bb_lower", "FLOAT"),
            bigquery.SchemaField("bb_width", "FLOAT"),
            bigquery.SchemaField("stoch_k", "FLOAT"),
            bigquery.SchemaField("stoch_d", "FLOAT"),
            bigquery.SchemaField("adx", "FLOAT"),
            bigquery.SchemaField("atr", "FLOAT"),
            bigquery.SchemaField("obv", "FLOAT"),
            # Add more indicators as needed
        ]
        
        try:
            self.client.get_table(table_id)
            logger.info(f"Table {table_id} already exists")
        except Exception:
            # Table doesn't exist, create it
            table = bigquery.Table(table_id, schema=schema)
            table = self.client.create_table(table)
            logger.info(f"Created table {table_id}")
    
    def _prepare_dataframe_for_bigquery(self, df):
        """
        Prepare a DataFrame for BigQuery by handling NaN values and timestamps
        """
        # Make a copy to avoid modifying the original
        df = df.copy()
        
        # Replace NaN values with None (which becomes NULL in BigQuery)
        for col in df.columns:
            df[col] = df[col].apply(lambda x: None if pd.isna(x) else x)
        
        # Ensure timestamp is in datetime format
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        return df
    
    def _load_dataframe_using_file(self, df, table_id, schema=None):
        """
        Load a DataFrame to BigQuery using a temporary file
        This works around the streaming insert limitation in the free tier
        """
        # Prepare the DataFrame
        df = self._prepare_dataframe_for_bigquery(df)
        
        # Create a temporary JSON file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            for _, row in df.iterrows():
                # Convert row to dict and handle special types
                row_dict = {}
                for col, val in row.items():
                    if isinstance(val, (pd.Timestamp, datetime)):
                        row_dict[col] = val.isoformat()
                    elif pd.isna(val):
                        row_dict[col] = None
                    else:
                        row_dict[col] = val
                
                # Write as JSON
                f.write(json.dumps(row_dict, cls=CustomJSONEncoder) + '\n')
            
            temp_file_name = f.name
        
        try:
            # Configure the load job
            job_config = bigquery.LoadJobConfig(
                source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
                write_disposition="WRITE_APPEND",
                schema=schema
            )
            
            # Load the data from the temporary file
            with open(temp_file_name, "rb") as source_file:
                job = self.client.load_table_from_file(
                    source_file, table_id, job_config=job_config
                )
            
            # Wait for the job to complete
            job.result()
            
            logger.info(f"Loaded {len(df)} rows to {table_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error loading data to {table_id}: {e}")
            import traceback
            traceback.print_exc()
            return False
            
        finally:
            # Clean up the temporary file
            try:
                os.remove(temp_file_name)
            except:
                pass
    
    def store_market_data(self, df, timeframe):
        """
        Store market data in BigQuery
        
        Args:
            df: DataFrame with market data
            timeframe: Timeframe of the data (e.g., '1d', '4h')
        """
        if df.empty:
            logger.warning("No market data to store")
            return
        
        # Add timeframe column if not present
        if 'timeframe' not in df.columns:
            df['timeframe'] = timeframe
        
        # Prepare the table reference
        table_id = f"{self.project_id}.{self.dataset}.market_data"
        
        # Get the table schema
        table = self.client.get_table(table_id)
        schema = table.schema
        
        # Load the data using a file (works around streaming insert limitation)
        success = self._load_dataframe_using_file(df, table_id, schema)
        
        if success:
            logger.info(f"Stored {len(df)} market data records in BigQuery")
        else:
            logger.error("Failed to store market data in BigQuery")
    
    def store_sentiment_data(self, df):
        """
        Store sentiment data in BigQuery
        
        Args:
            df: DataFrame with sentiment data
        """
        if df.empty:
            logger.warning("No sentiment data to store")
            return
        
        # Log the sentiment data for debugging
        logger.info(f"Storing sentiment data: {df[['headline', 'sentiment_score', 'sentiment_label']].head(3)}")
        
        # Prepare the table reference
        table_id = f"{self.project_id}.{self.dataset}.sentiment_data"
        
        # Get the table schema
        table = self.client.get_table(table_id)
        schema = table.schema
        schema_fields = [field.name for field in schema]
        
        # Filter DataFrame to only include columns in the schema
        columns_to_keep = [col for col in df.columns if col in schema_fields]
        df_filtered = df[columns_to_keep]
        
        # Load the data using a file (works around streaming insert limitation)
        success = self._load_dataframe_using_file(df_filtered, table_id, schema)
        
        if success:
            logger.info(f"Stored {len(df)} sentiment data records in BigQuery")
        else:
            logger.error("Failed to store sentiment data in BigQuery")
    
    def store_trading_signals(self, df):
        """
        Store trading signals in BigQuery
        
        Args:
            df: DataFrame with trading signals
        """
        if df.empty:
            logger.warning("No trading signals to store")
            return
        
        # Log the signals for debugging
        logger.info(f"Storing trading signals: {df[['symbol', 'signal', 'sentiment_score', 'confidence']].head(3)}")
        
        # Ensure all required fields are present
        required_fields = ['timestamp', 'symbol', 'signal', 'price', 'technical_score', 'sentiment_score', 'confidence', 'indicators']
        for field in required_fields:
            if field not in df.columns:
                if field in ['sentiment_score', 'technical_score', 'confidence']:
                    df[field] = 0.0
                elif field == 'indicators':
                    df[field] = ''
                else:
                    df[field] = None
        
        # Prepare the table reference
        table_id = f"{self.project_id}.{self.dataset}.trading_signals"
        
        # Get the table schema
        table = self.client.get_table(table_id)
        schema = table.schema
        
        # Load the data using a file (works around streaming insert limitation)
        success = self._load_dataframe_using_file(df, table_id, schema)
        
        if success:
            logger.info(f"Stored {len(df)} trading signals in BigQuery")
        else:
            logger.error("Failed to store trading signals in BigQuery")
    
    def update_trading_signals(self, df):
        """
        Update existing trading signals in BigQuery
        
        Args:
            df: DataFrame with updated trading signals
        """
        if df.empty:
            logger.warning("No trading signals to update")
            return
        
        # For simplicity, we'll just append the updated signals
        # In a production system, you would use a more sophisticated update mechanism
        self.store_trading_signals(df)
    
    def store_technical_features(self, df, timeframe):
        """
        Store technical features in BigQuery
        
        Args:
            df: DataFrame with technical features
            timeframe: Timeframe of the data (e.g., '1d', '4h')
        """
        if df.empty:
            logger.warning("No technical features to store")
            return
        
        # Add timeframe column if not present
        if 'timeframe' not in df.columns:
            df['timeframe'] = timeframe
        
        # Prepare the table reference
        table_id = f"{self.project_id}.{self.dataset}.technical_features"
        
        # Get the table schema
        table = self.client.get_table(table_id)
        schema = table.schema
        schema_fields = [field.name for field in schema]
        
        # Filter DataFrame to only include columns in the schema
        columns_to_keep = [col for col in df.columns if col in schema_fields]
        df_filtered = df[columns_to_keep]
        
        # Load the data using a file (works around streaming insert limitation)
        success = self._load_dataframe_using_file(df_filtered, table_id, schema)
        
        if success:
            logger.info(f"Stored {len(df)} technical features records in BigQuery")
        else:
            logger.error("Failed to store technical features in BigQuery")
    
    def query_recent_market_data(self, symbol, limit, timeframe):
        """
        Query recent market data from BigQuery
        
        Args:
            symbol: Trading symbol (e.g., 'BTC/USDT')
            limit: Maximum number of records to return
            timeframe: Timeframe of the data (e.g., '1d', '4h')
            
        Returns:
            pandas.DataFrame: DataFrame with market data
        """
        query = f"""
        SELECT *
        FROM `{self.project_id}.{self.dataset}.market_data`
        WHERE symbol = '{symbol}' AND timeframe = '{timeframe}'
        ORDER BY timestamp DESC
        LIMIT {limit}
        """
        
        try:
            df = self.client.query(query).to_dataframe()
            return df
        except Exception as e:
            logger.error(f"Error querying market data: {e}")
            return pd.DataFrame()
    
    def query_recent_sentiment(self, hours=24):
        """
        Query recent sentiment data from BigQuery
        
        Args:
            hours: Number of hours to look back
            
        Returns:
            pandas.DataFrame: DataFrame with sentiment data
        """
        query = f"""
        SELECT *
        FROM `{self.project_id}.{self.dataset}.sentiment_data`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {hours} HOUR)
        ORDER BY timestamp DESC
        """
        
        try:
            df = self.client.query(query).to_dataframe()
            logger.info(f"Retrieved {len(df)} sentiment records from BigQuery")
            if not df.empty:
                logger.info(f"Sample sentiment data: {df[['headline', 'sentiment_score', 'sentiment_label']].head(2)}")
            return df
        except Exception as e:
            logger.error(f"Error querying sentiment data: {e}")
            return pd.DataFrame()
    
    def get_all_transactions(self):
        """
        Get all transactions from BigQuery
        
        Returns:
            pandas.DataFrame: DataFrame with all transactions
        """
        query = f"""
        SELECT *
        FROM `{self.project_id}.{self.dataset}.transactions`
        ORDER BY timestamp DESC
        """
        
        try:
            df = self.client.query(query).to_dataframe()
            return df
        except Exception as e:
            logger.error(f"Error querying transactions: {e}")
            return pd.DataFrame()
