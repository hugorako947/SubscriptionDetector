import { ROUTES } from '../../app/routes'
import { BottomActions, SecondaryLink } from '../components/Buttons'
import { Screen, ScreenTitle } from '../components/Screen'

/** Placeholder until the capture guide and import are built (next phases). */
export function Captures() {
  return (
    <Screen back={{ href: ROUTES.home, label: 'Accueil' }}>
      <ScreenTitle>Guide de capture</ScreenTitle>
      <p className="mt-3 text-lg text-muted">
        Cette étape arrive dans la suite du projet : choisir tes captures d'écran et les lire sur ton téléphone.
      </p>
      <BottomActions>
        <SecondaryLink href={ROUTES.home}>Revenir à l'accueil</SecondaryLink>
      </BottomActions>
    </Screen>
  )
}
