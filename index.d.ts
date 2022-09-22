import { Adapter } from '@sveltejs/kit'

export interface AdapterOptions {
    platform: Array<'ios' | 'android' | 'electron'>
}

export default function plugin(options?: AdapterOptions): Adapter;