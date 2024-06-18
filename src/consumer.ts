import { Natsio } from './natsio'
import { toCamelCase } from './utils/to-camel-case'

export interface ConsumerOpts {
    durable_name?: string
    filter_subject?: string
    max_messages?: number
    expires?: number
    failure_delay?: number
}

export class NatsioConsumer {
    private readonly nats: Natsio
    private readonly subject: string
    private readonly callback: (err: any, msg: any, data?: any) => void
    private stream: any
    private readonly opts: ConsumerOpts

    constructor(
        nats: Natsio,
        subject: string,
        callback: (err: any, msg: any, data?: any) => void,
        stream: any = null,
        opts: ConsumerOpts = {}
    ) {
        this.nats = nats
        this.subject = subject
        this.callback = callback
        this.stream = stream
        this.opts = opts
    }

    async consume(): Promise<void> {
        if (this.nats['js']) {
            await this.jetStreamConsume(this.subject, this.callback, this.opts)
        } else {
            this.natsConsume(this.subject, this.callback)
        }
    }

    private natsConsume(
        subject: string,
        callback: (err: any, msg: any, data?: any) => void
    ): void {
        this.nats['nc']!.subscribe(subject, {
            callback: (err, msg) => {
                if (err) {
                    callback(err, null)
                    return
                }
                const parsed = JSON.parse(this.nats['sc'].decode(msg.data))
                callback(null, msg, parsed.data)
            },
        })
    }

    private async jetStreamConsume(
        subject: string,
        callback: (err: any, msg: any, data?: any) => void,
        opts: ConsumerOpts = {}
    ): Promise<void> {
        opts = Object.assign(
            {
                durable_name: toCamelCase(subject),
                filter_subject: subject,
                max_messages: 1000,
                expires: 1000,
                failure_delay: 1000,
            },
            opts
        )

        try {
            await this.nats['jsm']!.consumers.add(this.stream.name, opts)
        } catch (err) {
            throw err
        }

        const consumer = await this.nats['js']!.consumers.get(
            this.stream.name,
            opts.durable_name!
        )
        const subscription = await consumer.consume({
            max_messages: opts.max_messages!,
            expires: opts.expires!,
        })

        // @ts-ignore
        for await (const msg of subscription) {
            try {
                const parsed = JSON.parse(this.nats['sc'].decode(msg.data))
                callback(null, msg, parsed.data)
            } catch (err) {
                callback(err, null)
                msg.nak(opts.failure_delay)
            }
        }
    }
}
