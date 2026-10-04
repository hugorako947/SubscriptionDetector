import { ROUTES } from '../../app/routes'
import { SecondaryLink } from '../components/Buttons'
import { Screen, ScreenTitle } from '../components/Screen'

export function NotFound() {
  return (
    <Screen>
      <ScreenTitle>Cette page n'existe pas</ScreenTitle>
      <p className="mt-3 text-lg text-muted">L'adresse est peut-être incomplète.</p>
      <p className="mt-4">
        <SecondaryLink href={ROUTES.home}>Revenir à l'accueil</SecondaryLink>
      </p>
    </Screen>
  )
}
