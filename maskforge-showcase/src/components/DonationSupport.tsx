import { useMemo, useState } from 'react'
import QrCodePixCustom from '../assets/qrcode-pix.png'
import QrCodePix15 from '../assets/qrcode-pix-15.png'
import QrCodePix30 from '../assets/qrcode-pix-30.png'
import QrCodePix7 from '../assets/qrcode-pix-7.png'
import type { Locale } from './TopNav'

const PIX_KEY = 'a278d104-0d88-438c-aef8-c7fa4a894cc1'

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const donationCopy = {
  'pt-BR': {
    close: 'Fechar popup de doacao',
    eyebrow: 'Apoie o maskarajs',
    title: 'Escolha um Pix e ajude a manter a forja acesa.',
    body: 'Cada faixa tem um QR pronto. Se nenhuma fizer sentido, use o valor personalizado e doe o quanto quiser. Sem pressao, so apoio consciente.',
    popular: 'mais escolhido',
    selected: 'QR selecionado',
    how: 'Como doar',
    howBody: 'Escaneie o QR selecionado no app do banco ou copie a chave Pix para enviar um valor personalizado.',
    copy: 'Copiar chave Pix',
    copied: 'Chave copiada',
    customNote: 'Use este QR para escolher qualquer valor no seu banco.',
    tiers: [
      ['R$ 7', 'Gole simbolico', 'Um apoio leve para dizer: gostei disso.', QrCodePix7],
      ['R$ 15', 'Pague um Monster', 'Energia direta para continuar lapidando a lib.', QrCodePix15],
      ['R$ 30', 'Sprint de energia', 'Para quem ja usou em formulario real e quer fortalecer o projeto.', QrCodePix30],
      ['Livre', 'Valor personalizado', 'Escolha qualquer valor no Pix e apoie do seu jeito.', QrCodePixCustom],
    ],
  },
  en: {
    close: 'Close donation popup',
    eyebrow: 'Support maskarajs',
    title: 'Pick a Pix QR and help keep the forge warm.',
    body: 'Each tier has a ready-to-scan QR code. If none fits, use the custom amount option and donate whatever feels right. No pressure, just conscious support.',
    popular: 'most picked',
    selected: 'Selected QR',
    how: 'How to donate',
    howBody: 'Scan the selected QR code in your banking app or copy the Pix key to send a custom amount.',
    copy: 'Copy Pix key',
    copied: 'Pix key copied',
    customNote: 'Use this QR to choose any amount in your banking app.',
    tiers: [
      ['R$ 7', 'Small sip', 'A light way to say: I like this.', QrCodePix7],
      ['R$ 15', 'Buy a Monster', 'Direct energy to keep polishing the library.', QrCodePix15],
      ['R$ 30', 'Energy sprint', 'For anyone using it in real forms and wanting to strengthen the project.', QrCodePix30],
      ['Custom', 'Custom amount', 'Choose any Pix amount and support it your way.', QrCodePixCustom],
    ],
  },
} as const

type DonationSupportProps = {
  locale: Locale
  open: boolean
  onClose: () => void
}

export function DonationSupport({ locale, open, onClose }: DonationSupportProps) {
  const t = donationCopy[locale]
  const [copied, setCopied] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(1)
  const selectedTier = t.tiers[selectedIndex]
  const selectedQr = selectedTier[3]
  const isCustom = selectedIndex === t.tiers.length - 1

  const titleId = useMemo(() => `donation-title-${locale}`, [locale])

  if (!open) return null

  async function copyPixKey() {
    try {
      await navigator.clipboard.writeText(PIX_KEY)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-ink/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section className="relative grid w-[min(980px,100%)] gap-5 rounded-xl border border-line bg-surface p-5 text-ink shadow-[0_30px_90px_rgb(0_0_0_/_28%)]" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
        <button className="absolute right-3 top-3 grid size-[34px] place-items-center rounded-full border border-line bg-surface font-black text-ink" type="button" aria-label={t.close} onClick={onClose}>
          x
        </button>

        <div className="grid gap-2.5 pr-9">
          <span className="w-fit rounded-full bg-language-slot px-2.5 py-1.5 text-xs font-black uppercase text-[var(--language-slot-ink)]">{t.eyebrow}</span>
          <h2 className="m-0 max-w-[760px] text-[clamp(30px,4vw,50px)] leading-none text-ink" id={titleId}>{t.title}</h2>
          <p className="m-0 max-w-[760px] leading-[1.55] text-muted">{t.body}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.75fr)]">
          <div className="grid gap-2 sm:grid-cols-2" aria-label={t.eyebrow}>
            {t.tiers.map(([amount, title, description], index) => (
              <button className={cn('grid min-h-36 content-start gap-1.5 rounded-lg border border-line bg-surface p-4 text-left shadow-maskara-soft', selectedIndex === index && 'border-teal bg-[linear-gradient(180deg,color-mix(in_srgb,var(--teal)_12%,var(--surface)),var(--surface))]')} key={title} type="button" aria-pressed={selectedIndex === index} onClick={() => setSelectedIndex(index)}>
                {index === 1 ? <small className="w-fit rounded-full bg-language-slot px-2 py-1 text-[11px] font-black uppercase text-[var(--language-slot-ink)]">{t.popular}</small> : null}
                <strong className="text-3xl text-teal">{amount}</strong>
                <span className="font-black text-ink">{title}</span>
                <p className="m-0 text-sm leading-[1.4] text-muted">{description}</p>
              </button>
            ))}
          </div>

          <div className="grid content-start gap-4 rounded-lg border border-line bg-surface-soft p-4">
            <div className="mx-auto grid aspect-square w-[min(260px,100%)] place-items-center rounded-lg border border-line bg-white p-3">
              <img className="h-full w-full object-contain" src={selectedQr} alt={`${t.selected}: ${selectedTier[0]}`} />
            </div>
            <div className="grid gap-2">
              <strong className="text-ink">{t.selected}: {selectedTier[0]}</strong>
              <p className="m-0 text-sm leading-[1.45] text-muted">{isCustom ? t.customNote : selectedTier[2]}</p>
              <code className="block [overflow-wrap:anywhere]">{PIX_KEY}</code>
              <button className="min-h-11 rounded-lg bg-ink px-4 font-black text-ink-contrast" type="button" onClick={copyPixKey}>
                {copied ? t.copied : t.copy}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
