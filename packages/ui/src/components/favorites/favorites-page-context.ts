import type { InjectionKey } from 'vue'
import type { FavoritePrompt } from '@prompt-optimizer/core'

export interface FavoritesPageActions {
  useFavorite: (favorite: FavoritePrompt) => boolean | Promise<boolean>
  returnToWorkspace: () => void
}

export const favoritesPageActionsKey: InjectionKey<FavoritesPageActions> = Symbol('favoritesPageActions')
