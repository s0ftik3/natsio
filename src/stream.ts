import { Natsio } from './natsio'
import { ConsumerOpts, NatsioConsumer } from './consumer'

interface StreamOpts {
    [key: string]: any
    duplicates?: number
}

export class NatsioStream {
    private readonly nats: Natsio
    private readonly name: string
    private readonly subjects: string[]
    private readonly opts: StreamOpts

    constructor(
        nats: Natsio,
        name: string,
        subjects: string[] = [],
        opts: StreamOpts = {}
    ) {
        this.name = name
        this.subjects = subjects
        this.opts = opts
        this.nats = nats
    }

    async init(): Promise<void> {
        try {
            await this.nats['jsm']!.streams.add({
                name: this.name,
                subjects: this.subjects,
                ...this.opts,
            })
        } catch (err) {
            throw err
        }
    }

    on(
        subject: string,
        callback: (err: any, msg: any, data?: any) => void,
        opts: ConsumerOpts = {}
    ): void {
        const consumer = new NatsioConsumer(
            this.nats,
            subject,
            callback,
            this,
            opts
        )
        consumer.consume().catch(err => console.error(err))
    }
}
