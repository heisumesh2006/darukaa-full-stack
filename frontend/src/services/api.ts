import axios from 'axios'
import { config } from '../app/config'

export const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 15000,
  headers: { Accept: 'application/json' },
})
