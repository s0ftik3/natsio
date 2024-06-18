# natsio

A simple NATS (JetStream supported) wrapper to make using NATS functionality, including streams, easier. This library provides an abstraction over the existing NATS library, simplifying its usage.

## Installation

Install the library using npm:

```sh
npm install natsio
```

## Usage

### Basic NATS Functionality

Here’s an example demonstrating basic NATS functionality:

```ts
import { Natsio } from 'natsio'

const natsConfig = {
    servers: ['nats://localhost:4222'],
}

async function runBasicNatsExample() {
    const natsio = new Natsio(natsConfig)

    await natsio.connect()

    natsio.on('test.basic', (err, msg, data) => {
        if (err) {
            console.error('Error receiving message:', err)
        } else {
            console.log(
                'Received message:',
                data,
                'with ID:',
                msg.headers.get('message_id')
            )
        }
    })
    natsio.on('test.request', (err, msg, data) => {
        if (err) {
            console.error('Error receiving message:', err)
        } else {
            console.log('Received message:', data)
            msg.respond({ data: 1 })
        }
    })

    natsio.send('test.basic', { hello: 'world' })

    natsio.request('test.request', { request: 'data' }, (err, response) => {
        if (err) {
            console.error('Error with request:', err)
        } else {
            console.log('Received response:', response)
        }
    })
}

runBasicNatsExample().catch(console.error)
```

### JetStream Functionality

Here’s an example demonstrating JetStream functionality:

```ts
import { Natsio } from 'natsio'

const natsConfig = {
    servers: ['nats://localhost:4222'],
    jet_stream: true,
}

async function runJetStreamExample() {
    const natsio = new Natsio(natsConfig)

    await natsio.connect()

    const stream = await natsio.createStream('mystream', ['mystream.*'])

    stream.on('mystream.subject', (err, msg, data) => {
        if (err) {
            console.error('Error receiving message:', err)
            msg.term()
        } else {
            console.log(
                'Received JetStream message:',
                data,
                'with ID:',
                msg.headers.get('message_id')
            )
            msg.ack()
        }
    })

    natsio.send('mystream.subject', { hello: 'world' })
}

runJetStreamExample().catch(console.error)
```

## API Reference

### `Natsio`

##### `constructor(config: NatsioConfig)`

Creates a new instance of `Natsio`.

-   `config`: An object containing the configuration for the NATS client.
    -   `servers`: An array of NATS server URLs.
    -   `jet_stream`: A boolean indicating whether to use JetStream.

##### `connect(): Promise<void>`

Connects to the NATS server(s).

##### `on(subject: string, callback: (err: any, msg: any, data?: any) => void): void`

Subscribes to a subject and sets up a callback to handle incoming messages.

##### `send(subject: string, data: any): void`

Publishes a message to a subject.

##### `request(subject: string, data: any, callback: (err: any, response: any) => void, opts: { timeout?: number } = {}): void`

Sends a request to a subject and sets up a callback to handle the response.

##### `createStream(name: string, subjects: string[] = [], opts: Record<string, any> = {}): Promise<NatsioStream>`

Creates a JetStream stream.

### `NatsioStream`

##### `constructor(nats: Natsio, name: string, subjects: string[] = [], opts: Record<string, any> = {})`

Creates a new instance of `NatsioStream`.

-   `nats`: The `Natsio` instance.
-   `name`: The name of the stream.
-   `subjects`: An array of subjects for the stream.
-   `opts`: Additional options for the stream.

##### `init(): Promise<void>`

Initializes the JetStream stream.

##### `on(subject: string, callback: (err: any, msg: any, data?: any) => void, opts: Record<string, any> = {}): void`

Subscribes to a subject within the stream and sets up a callback to handle incoming messages.

### `NatsioConsumer`

##### `constructor(nats: Natsio, subject: string, callback: (err: any, msg: any, data?: any) => void, stream: any = null, opts: ConsumerOpts = {})`

Creates a new instance of `NatsioConsumer`.

-   `nats`: The `Natsio` instance.
-   `subject`: The subject to subscribe to.
-   `callback`: The callback to handle incoming messages.
-   `stream`: The stream to consume from (optional).
-   `opts`: Additional options for the consumer.

##### `consume(): Promise<void>`

Starts consuming messages from the subject.
