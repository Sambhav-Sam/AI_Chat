#!/usr/bin/env python3
"""
Data Analysis Task for Isolated Execution
This module is executed inside a Docker container.
"""

import os
import json
import sys
import time
import traceback
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import io
import base64
from pathlib import Path

def execute(params):
    """
    Execute a data analysis task with the given parameters
    
    Parameters:
    params (dict): Task parameters including:
        - dataset: Path to dataset or name of sample dataset
        - analysis_type: Type of analysis to perform
        - columns: List of columns to analyze
        - visualize: Whether to generate visualizations
    
    Returns:
    dict: Results of the analysis task
    """
    try:
        # Parse parameters
        dataset = params.get('dataset', 'sample_dataset')
        analysis_type = params.get('analysis_type', 'descriptive')
        columns = params.get('columns', [])
        visualize = params.get('visualize', True)
        
        print(f"Starting data analysis of {dataset} with analysis type: {analysis_type}")
        
        # Initialize results
        results = {
            'success': True,
            'analysis_type': analysis_type,
            'dataset': dataset,
            'stats': {},
            'visualizations': [],
            'execution_time': 0
        }
        
        start_time = time.time()
        
        # Load the dataset
        df = load_dataset(dataset)
        
        if df is None:
            return {
                'success': False,
                'error': f"Could not load dataset: {dataset}",
                'error_type': 'data_load_error'
            }
        
        # If no columns specified, use all
        if not columns:
            columns = df.columns.tolist()
        
        # Perform the requested analysis
        if analysis_type == 'descriptive':
            results['stats'] = perform_descriptive_analysis(df, columns)
        elif analysis_type == 'correlation':
            results['stats'] = perform_correlation_analysis(df, columns)
        elif analysis_type == 'timeseries':
            results['stats'] = perform_timeseries_analysis(df, columns)
        else:
            results['stats'] = perform_descriptive_analysis(df, columns)
        
        # Generate visualizations if requested
        if visualize:
            results['visualizations'] = generate_visualizations(df, analysis_type, columns)
        
        # Calculate execution time
        results['execution_time'] = time.time() - start_time
        
        return results
    
    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f"Error in data analysis task: {str(e)}")
        print(error_traceback)
        
        return {
            'success': False,
            'error': str(e),
            'traceback': error_traceback,
            'error_type': 'execution_error'
        }

def load_dataset(dataset):
    """
    Load a dataset from file or use a sample dataset
    
    Parameters:
    dataset (str): Path to dataset or name of sample dataset
    
    Returns:
    DataFrame: The loaded dataset or None if it couldn't be loaded
    """
    try:
        if dataset == 'sample_dataset':
            # Create a sample dataset
            np.random.seed(42)
            dates = pd.date_range('20230101', periods=100)
            df = pd.DataFrame({
                'date': dates,
                'value': np.random.randn(100).cumsum(),
                'category': np.random.choice(['A', 'B', 'C'], 100),
                'metric1': np.random.normal(10, 2, 100),
                'metric2': np.random.normal(20, 5, 100)
            })
            return df
        elif os.path.exists(dataset):
            # Load from file
            file_ext = os.path.splitext(dataset)[1].lower()
            if file_ext == '.csv':
                return pd.read_csv(dataset)
            elif file_ext in ['.xls', '.xlsx']:
                return pd.read_excel(dataset)
            elif file_ext == '.json':
                return pd.read_json(dataset)
            else:
                print(f"Unsupported file format: {file_ext}")
                return None
        else:
            print(f"Dataset not found: {dataset}")
            return None
    
    except Exception as e:
        print(f"Error loading dataset: {str(e)}")
        return None

def perform_descriptive_analysis(df, columns):
    """
    Perform descriptive statistical analysis on the dataset
    
    Parameters:
    df (DataFrame): The dataset to analyze
    columns (list): Columns to include in the analysis
    
    Returns:
    dict: Statistical results
    """
    stats = {}
    
    # Filter columns that exist in the dataframe
    valid_columns = [col for col in columns if col in df.columns]
    
    # Basic statistics for numerical columns
    num_columns = df[valid_columns].select_dtypes(include=np.number).columns.tolist()
    if num_columns:
        stats['numerical'] = json.loads(df[num_columns].describe().to_json())
    
    # Frequency counts for categorical columns
    cat_columns = df[valid_columns].select_dtypes(include=['object', 'category']).columns.tolist()
    if cat_columns:
        stats['categorical'] = {}
        for col in cat_columns:
            stats['categorical'][col] = df[col].value_counts().to_dict()
    
    # Count missing values
    stats['missing_values'] = df[valid_columns].isnull().sum().to_dict()
    
    # Data types
    stats['data_types'] = {col: str(df[col].dtype) for col in valid_columns}
    
    return stats

def perform_correlation_analysis(df, columns):
    """
    Perform correlation analysis on numerical columns
    
    Parameters:
    df (DataFrame): The dataset to analyze
    columns (list): Columns to include in the analysis
    
    Returns:
    dict: Correlation results
    """
    stats = {}
    
    # Filter for numerical columns
    valid_columns = [col for col in columns if col in df.columns]
    num_df = df[valid_columns].select_dtypes(include=np.number)
    
    if not num_df.empty:
        # Calculate correlation matrix
        corr_matrix = num_df.corr()
        stats['correlation_matrix'] = json.loads(corr_matrix.to_json())
        
        # Find strongest correlations
        corr_matrix_values = corr_matrix.abs().unstack()
        corr_matrix_values = corr_matrix_values[corr_matrix_values < 1.0]  # Remove self-correlations
        stats['strongest_correlations'] = corr_matrix_values.nlargest(10).to_dict()
    
    return stats

def perform_timeseries_analysis(df, columns):
    """
    Perform time series analysis if a date column is available
    
    Parameters:
    df (DataFrame): The dataset to analyze
    columns (list): Columns to include in the analysis
    
    Returns:
    dict: Time series analysis results
    """
    stats = {}
    
    # Check for date columns
    date_cols = df.select_dtypes(include=['datetime64']).columns.tolist()
    
    if not date_cols:
        # Try to convert string columns to dates
        for col in df.columns:
            try:
                if pd.api.types.is_string_dtype(df[col]):
                    df[col + '_date'] = pd.to_datetime(df[col])
                    date_cols.append(col + '_date')
            except:
                pass
    
    if date_cols:
        date_col = date_cols[0]  # Use the first date column
        
        # Filter numerical columns
        num_cols = [col for col in columns if col in df.columns]
        num_cols = df[num_cols].select_dtypes(include=np.number).columns.tolist()
        
        if num_cols:
            stats['timeseries'] = {}
            
            # Group by date and calculate statistics
            for col in num_cols:
                # Resample to day level and get mean
                try:
                    ts_df = df.set_index(date_col)[[col]]
                    daily_mean = ts_df.resample('D').mean()
                    
                    # Calculate rolling statistics
                    stats['timeseries'][col] = {
                        'trend': json.loads(daily_mean.rolling(window=7).mean().to_json()),
                        'volatility': json.loads(daily_mean.rolling(window=7).std().to_json())
                    }
                except Exception as e:
                    print(f"Error in timeseries analysis for {col}: {str(e)}")
    
    return stats

def generate_visualizations(df, analysis_type, columns):
    """
    Generate visualizations based on the analysis type
    
    Parameters:
    df (DataFrame): The dataset to visualize
    analysis_type (str): Type of analysis
    columns (list): Columns to include in the visualizations
    
    Returns:
    list: Base64 encoded PNG images of the visualizations
    """
    visualizations = []
    
    # Filter columns that exist in the dataframe
    valid_columns = [col for col in columns if col in df.columns]
    
    try:
        # Set the plot style
        plt.style.use('ggplot')
        
        if analysis_type == 'descriptive':
            # Histogram for numerical columns
            num_cols = df[valid_columns].select_dtypes(include=np.number).columns.tolist()
            if num_cols and len(num_cols) > 0:
                for col in num_cols[:3]:  # Limit to first 3 columns
                    plt.figure(figsize=(8, 6))
                    df[col].hist(bins=20)
                    plt.title(f'Histogram of {col}')
                    plt.xlabel(col)
                    plt.ylabel('Frequency')
                    img = fig_to_base64(plt.gcf())
                    visualizations.append({
                        'title': f'Histogram of {col}',
                        'type': 'histogram',
                        'image': img
                    })
                    plt.close()
            
            # Bar chart for categorical columns
            cat_cols = df[valid_columns].select_dtypes(include=['object', 'category']).columns.tolist()
            if cat_cols and len(cat_cols) > 0:
                for col in cat_cols[:2]:  # Limit to first 2 columns
                    plt.figure(figsize=(8, 6))
                    df[col].value_counts().head(10).plot(kind='bar')
                    plt.title(f'Frequency of {col}')
                    plt.xlabel(col)
                    plt.ylabel('Count')
                    plt.xticks(rotation=45)
                    plt.tight_layout()
                    img = fig_to_base64(plt.gcf())
                    visualizations.append({
                        'title': f'Frequency of {col}',
                        'type': 'bar',
                        'image': img
                    })
                    plt.close()
        
        elif analysis_type == 'correlation':
            # Correlation heatmap
            num_df = df[valid_columns].select_dtypes(include=np.number)
            if not num_df.empty and num_df.shape[1] > 1:
                plt.figure(figsize=(10, 8))
                corr = num_df.corr()
                plt.imshow(corr, cmap='coolwarm', interpolation='none', aspect='auto')
                plt.colorbar()
                plt.title('Correlation Matrix')
                plt.xticks(range(len(corr.columns)), corr.columns, rotation=90)
                plt.yticks(range(len(corr.columns)), corr.columns)
                plt.tight_layout()
                img = fig_to_base64(plt.gcf())
                visualizations.append({
                    'title': 'Correlation Matrix',
                    'type': 'heatmap',
                    'image': img
                })
                plt.close()
                
                # Scatter plot for the highest correlated pair
                if num_df.shape[1] >= 2:
                    corr_matrix = num_df.corr().abs().unstack()
                    corr_matrix = corr_matrix[corr_matrix < 1.0]  # Remove self-correlations
                    if not corr_matrix.empty:
                        highest_corr = corr_matrix.idxmax()
                        col1, col2 = highest_corr
                        
                        plt.figure(figsize=(8, 6))
                        plt.scatter(df[col1], df[col2], alpha=0.5)
                        plt.title(f'Scatter plot: {col1} vs {col2}')
                        plt.xlabel(col1)
                        plt.ylabel(col2)
                        plt.tight_layout()
                        img = fig_to_base64(plt.gcf())
                        visualizations.append({
                            'title': f'Scatter plot: {col1} vs {col2}',
                            'type': 'scatter',
                            'image': img
                        })
                        plt.close()
        
        elif analysis_type == 'timeseries':
            # Time series plot
            date_cols = df.select_dtypes(include=['datetime64']).columns.tolist()
            
            if not date_cols:
                # Try to convert string columns to dates
                for col in df.columns:
                    try:
                        if pd.api.types.is_string_dtype(df[col]):
                            df[col + '_date'] = pd.to_datetime(df[col])
                            date_cols.append(col + '_date')
                    except:
                        pass
            
            if date_cols:
                date_col = date_cols[0]  # Use the first date column
                
                # Filter numerical columns
                num_cols = df[valid_columns].select_dtypes(include=np.number).columns.tolist()
                
                if num_cols:
                    for col in num_cols[:2]:  # Limit to first 2 columns
                        plt.figure(figsize=(10, 6))
                        ts_df = df.set_index(date_col)[[col]]
                        ts_df.plot()
                        plt.title(f'Time Series of {col}')
                        plt.xlabel('Date')
                        plt.ylabel(col)
                        plt.grid(True)
                        plt.tight_layout()
                        img = fig_to_base64(plt.gcf())
                        visualizations.append({
                            'title': f'Time Series of {col}',
                            'type': 'line',
                            'image': img
                        })
                        plt.close()
        
    except Exception as e:
        print(f"Error generating visualizations: {str(e)}")
    
    return visualizations

def fig_to_base64(fig):
    """
    Convert a matplotlib figure to base64 encoded PNG
    
    Parameters:
    fig (Figure): The matplotlib figure
    
    Returns:
    str: Base64 encoded PNG
    """
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=100)
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    return img_str

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