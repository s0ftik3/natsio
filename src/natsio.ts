import {
    connect,
    StringCodec,
    JetStreamManager,
    JetStreamClient,
    NatsConnection,
    headers as messageHeaders,
} from 'nats'
import { v4 as uuidv4 } from 'uuid'
import { NatsioConsumer } from './consumer'
import { NatsioStream } from './stream'

interface NatsioConfig {
    servers: string[]
    jet_stream?: boolean
}

export class Natsio {
    private readonly servers: string[]
    private readonly jetStream: boolean
    private nc: NatsConnection | null = null
    private sc = StringCodec()
    private js: JetStreamClient | null = null
    private jsm: JetStreamManager | null = null

    constructor(config: NatsioConfig) {
        this.servers = config.servers
        this.jetStream = config.jet_stream || false
    }

    async connect(): Promise<void> {
        this.nc = await connect({ servers: this.servers })
        if (this.jetStream) {
            this.js = this.nc.jetstream()
            this.jsm = await this.nc.jetstreamManager()
        }
    }

    on(
        subject: string,
        callback: (err: any, msg: any, data?: any) => void
    ): void {
        if (this.jetStream) {
            throw new Error(
                'With JetStream you must use `on` only with specifying a stream.'
            )
        }

        const consumer = new NatsioConsumer(this, subject, callback)
        consumer.consume().catch(err => {
            throw new Error(err)
        })
    }

    async createStream(
        name: string,
        subjects: string[] = [],
        opts: Record<string, any> = {}
    ): Promise<NatsioStream> {
        if (!this.jetStream) {
            throw new Error(
                'Streams are only supported with `jet_stream` configuration enabled.'
            )
        }

        const stream = new NatsioStream(this, name, subjects, opts)
        await stream.init()

        return stream
    }

    send(subject: string, data: any): void {
        const payload = this.sc.encode(
            JSON.stringify({
                data,
            })
        )
        const headers = messageHeaders()
        headers.append('message_id', uuidv4())

        this[this.jetStream ? 'js' : 'nc']!.publish(subject, payload, {
            headers,
        })
    }

    request(
        subject: string,
        data: any,
        callback: (err: any, response: any) => void,
        opts: { timeout?: number } = {}
    ): void {
        if (this.jetStream) {
            throw new Error("JetStream doesn't support request method.")
        }
        const { timeout } = Object.assign(
            {
                timeout: 5000,
            },
            opts
        )
        const msg = this.sc.encode(
            JSON.stringify({
                data,
            })
        )

        this.nc!.request(subject, msg, { timeout })
            .then(msg => {
                callback(null, this.sc.decode(msg.data))
            })
            .catch(err => {
                callback(err, null)
            })
    }
}
