import * as React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card'

import { HOME_PATH, HOME_LABEL } from '../lib/app-mode'

export function NotFoundPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Página não encontrada</CardTitle>
          <CardDescription>
            O endereço acessado não existe ou foi removido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Verifique a URL ou retorne ao painel inicial.
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
