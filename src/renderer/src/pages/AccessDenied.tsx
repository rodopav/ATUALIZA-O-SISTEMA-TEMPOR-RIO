import * as React from 'react'
import { Link } from 'react-router-dom'
import { Crown, ShieldAlert } from 'lucide-react'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card'

import { APP_MODE, HOME_PATH, HOME_LABEL } from '../lib/app-mode'

const TITLE =
  APP_MODE === 'magnata' ? 'Acesso Magnata Negado' : 'Acesso negado'

const DESCRIPTION =
  APP_MODE === 'magnata'
    ? 'Você não tem acesso ao Magnata Dashboard.'
    : 'Você não tem permissão para acessar esta página.'

export function AccessDeniedPage(): React.ReactElement {
  const isMagnata = APP_MODE === 'magnata'
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div
            className={
              isMagnata
                ? 'mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amb-300 to-amb-500 text-asf-950'
                : 'mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10'
            }
          >
            {isMagnata ? (
              <Crown className="h-6 w-6" aria-hidden="true" />
            ) : (
              <ShieldAlert
                className="h-6 w-6 text-destructive"
                aria-hidden="true"
              />
            )}
          </div>
          <CardTitle className="text-2xl">{TITLE}</CardTitle>
          <CardDescription>{DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            {isMagnata
              ? 'O Magnata Dashboard é exclusivo para perfis executivos. Solicite acesso a um Admin Financeiro caso entenda que isso é um engano.'
              : 'Caso acredite que isso é um engano, entre em contato com um Admin Financeiro.'}
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link to={HOME_PATH}>{HOME_LABEL}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
