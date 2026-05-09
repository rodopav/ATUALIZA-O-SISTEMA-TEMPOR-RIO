export type AppMode = 'user' | 'admin' | 'magnata'

export const APP_MODE: AppMode =
  (import.meta.env.VITE_APP_MODE as AppMode | undefined) ?? 'user'

export const HOME_PATH: string =
  APP_MODE === 'admin'
    ? '/iam/usuarios'
    : APP_MODE === 'magnata'
      ? '/magnata'
      : '/dashboard'

export const HOME_LABEL: string =
  APP_MODE === 'admin'
    ? 'Voltar ao IAM'
    : APP_MODE === 'magnata'
      ? 'Voltar ao Magnata Dashboard'
      : 'Voltar ao Dashboard'

export const APP_TITLE: string =
  APP_MODE === 'admin'
    ? 'Rodopav Admin · IAM'
    : APP_MODE === 'magnata'
      ? 'Magnata Dashboard'
      : 'Tesouraria Rodopav'
