import type { ModelOptionSet, SelectableOption } from '../types/agent.js'
import type { ManagedProviderSummary } from '../types/provider.js'

export function buildModelOptionSet(providers: ManagedProviderSummary[]): ModelOptionSet {
  const providerOptions: SelectableOption[] = []
  const modelsByProvider: ModelOptionSet['modelsByProvider'] = {}
  const reasoningByModel: ModelOptionSet['reasoningByModel'] = {}

  for (const provider of providers) {
    providerOptions.push({ id: provider.name, label: provider.displayName })
    modelsByProvider[provider.name] = provider.models.map((model) => ({ id: model.id, label: model.id }))
    for (const model of provider.models) {
      reasoningByModel[`${provider.name}/${model.id}`] = model.reasoningEfforts.map((effort) => ({ id: effort, label: effort }))
    }
  }

  return { providers: providerOptions, modelsByProvider, reasoningByModel }
}
