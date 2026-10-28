import type { Colore } from '../modello/cubo.ts'
import type { Passo } from '../risolutore/notazione.ts'
import { disegnaMovimenti } from './pdfMovimenti.ts'
import { disegnaSequenza } from './pdfSequenza.ts'

// Un solo PDF per la sequenza: prima dove va ogni pezzo, poi le mosse una per una
export async function scaricaPdf(partenza: Colore[], passi: Passo[], titolo: string): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  disegnaMovimenti(
    pdf,
    partenza,
    passi.flatMap((passo) => passo.mosse),
    titolo,
  )
  pdf.addPage()
  disegnaSequenza(pdf, partenza, passi, titolo)
  pdf.save('rubik-orbit-sequenza.pdf')
}
