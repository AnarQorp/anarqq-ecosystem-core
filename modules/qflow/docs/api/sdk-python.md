# Qflow Python SDK

## Installation

```bash
pip install qflow-client
# or
poetry add qflow-client
```

## Quick Start

```python
from qflow_client import QflowClient
import asyncio

# Initialize client
client = QflowClient(
    base_url='https://api.qflow.anarq.org/v1',
    token='your-squid-token'
)

async def example():
    try:
        # Create a flow
        flow = await client.flows.create({
            'name': 'Hello World Flow',
            'description': 'A simple example flow',
            'steps': [
                {
                    'id': 'hello',
                    'type': 'task',
                    'action': 'log-message',
                    'params': {
                        'message': 'Hello, World!'
                    }
                }
            ],
            'metadata': {
                'tags': ['example'],
                'category': 'tutorial'
            }
        })

        print(f"Flow created: {flow['id']}")

        # Start execution
        execution = await client.executions.start(flow['id'], {
            'inputData': {'user': 'developer'}
        })

        print(f"Execution started: {execution['executionId']}")

        # Monitor execution
        status = await client.executions.get_status(execution['executionId'])
        print(f"Status: {status['status']}")

    except Exception as error:
        print(f"Error: {error}")

# Run the example
asyncio.run(example())
```

## Configuration

### Basic Configuration

```python
from qflow_client import QflowClient

client = QflowClient(
    base_url='https://api.qflow.anarq.org/v1',
    token='your-squid-token'
)
```

### Advanced Configuration

```python
from qflow_client import QflowClient
import httpx

# Custom HTTP client
http_client = httpx.AsyncClient(
    timeout=30.0,
    limits=httpx.Limits(max_connections=100)
)

client = QflowClient(
    base_url='https://api.qflow.anarq.org/v1',
    token='your-squid-token',
    timeout=30.0,
    retries=3,
    retry_delay=1.0,
    headers={
        'X-Client-Version': '1.0.0'
    },
    http_client=http_client
)
```

## API Reference

### Flow Management

#### Create Flow

```python
flow_definition = {
    'name': 'My Flow',
    'description': 'Flow description',
    'steps': [
        {
            'id': 'step1',
            'type': 'task',
            'action': 'my-action',
            'params': {'key': 'value'}
        }
    ],
    'metadata': {
        'tags': ['tag1', 'tag2'],
        'category': 'automation'
    }
}

flow = await client.flows.create(flow_definition)
print(f"Created flow: {flow['id']}")
```

#### List Flows

```python
flows = await client.flows.list(
    limit=20,
    offset=0,
    dao_subnet='dao-123',
    status='active',
    tags=['automation', 'email']
)

print(f"Total flows: {flows['pagination']['total']}")
for flow in flows['flows']:
    print(f"{flow['name']} ({flow['id']})")
```

## Support

- **Documentation**: [https://docs.qflow.anarq.org](https://docs.qflow.anarq.org)
- **GitHub**: [https://github.com/anarq/qflow-python-client](https://github.com/anarq/qflow-python-client)
- **PyPI**: [https://pypi.org/project/qflow-client/](https://pypi.org/project/qflow-client/)
- **Issues**: [https://github.com/anarq/qflow-python-client/issues](https://github.com/anarq/qflow-python-client/issues)