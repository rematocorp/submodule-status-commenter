import { getInput } from '@actions/core'
import { run } from './main'

run(getInput('submodule-path', { required: true }))
