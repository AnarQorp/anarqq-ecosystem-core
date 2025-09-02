# Qflow Python SDK Examples

## Quick Start

```python
from qflow_client import QflowClient
import asyncio

client = QflowClient(
    base_url='https://api.qflow.anarq.org/v1',
    token='your-squid-token'
)

async def main():
    # Create a simple flow
    flow = await client.flows.create({
        'name': 'Hello World',
        'steps': [{
            'id': 'hello',
            'type': 'task',
            'action': 'log-message',
            'params': {'message': 'Hello, World!'}
        }]
    })

    # Execute the flow
    execution = await client.executions.start(flow['id'])
    print(f"Execution started: {execution['executionId']}")

asyncio.run(main())
```

## Advanced Examples

### Data Processing Pipeline

```python
async def create_data_pipeline():
    pipeline = await client.flows.create({
        'name': 'Data Processing Pipeline',
        'steps': [
            {
                'id': 'fetch-data',
                'type': 'task',
                'action': 'fetch-from-api',
                'params': {'url': '{{input.source}}'},
                'onSuccess': 'process-data'
            },
            {
                'id': 'process-data',
                'type': 'parallel',
                'action': 'execute-parallel',
                'params': {
                    'steps': ['validate', 'transform', 'enrich']
                },
                'onSuccess': 'store-data'
            },
            {
                'id': 'store-data',
                'type': 'task',
                'action': 'store-in-database',
                'params': {'data': '{{steps.process-data.output}}'}
            }
        ]
    })
    
    return pipeline
```

### Error Handling

```python
from qflow_client.exceptions import QflowError, ValidationError

try:
    flow = await client.flows.create(flow_definition)
except ValidationError as e:
    print(f"Validation failed: {e.details}")
except QflowError as e:
    print(f"API error: {e.message}")
```
