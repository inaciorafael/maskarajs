import { useMemo, useState } from 'react'
import QrCodePixCustom from '../assets/qrcode-pix.png'
import QrCodePix15 from '../assets/qrcode-pix-15.png'
import QrCodePix30 from '../assets/qrcode-pix-30.png'
import QrCodePix7 from '../assets/qrcode-pix-7.png'
import type { Locale } from './TopNav'

const PIX_KEY = 'a278d104-0d88-438c-aef8-c7fa4a894cc1'

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
    <div className="donation-overlay" role="presentation" onMouseDown={onClose}>
      <section className="donation-popup" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
        <button className="donation-close" type="button" aria-label={t.close} onClick={onClose}>
          x
        </button>

        <div className="donation-copy">
          <span>{t.eyebrow}</span>
          <h2 id={titleId}>{t.title}</h2>
          <p>{t.body}</p>
        </div>

        <div className="donation-layout">
          <div className="donation-tiers" aria-label={t.eyebrow}>
            {t.tiers.map(([amount, title, description], index) => (
              <button className={selectedIndex === index ? 'selected' : ''} key={title} type="button" aria-pressed={selectedIndex === index} onClick={() => setSelectedIndex(index)}>
                {index === 1 ? <small>{t.popular}</small> : null}
                <strong>{amount}</strong>
                <span>{title}</span>
                <p>{description}</p>
              </button>
            ))}
          </div>

          <div className="donation-payment">
            <div className="donation-qr">
              <img src={selectedQr} alt={`${t.selected}: ${selectedTier[0]}`} />
            </div>
            <div>
              <strong>{t.selected}: {selectedTier[0]}</strong>
              <p>{isCustom ? t.customNote : selectedTier[2]}</p>
              <code>{PIX_KEY}</code>
              <button type="button" onClick={copyPixKey}>
                {copied ? t.copied : t.copy}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
