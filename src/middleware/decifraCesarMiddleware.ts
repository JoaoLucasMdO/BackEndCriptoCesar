import { Request, Response, NextFunction } from 'express'
import { promisePool } from '../db/db'

export const decifraMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { mensagemCriptografada } = req.body

  if (typeof mensagemCriptografada !== 'string') {
    res.status(400).json({ error: 'Esperado: mensagemCriptografada (string).' })
    return
  }

  try {
    const [rows] = await promisePool.query(
      'SELECT valor_hash FROM mensagens WHERE mensagem = ? LIMIT 1',
      [mensagemCriptografada]
    )

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(404).json({ error: 'Mensagem criptografada não encontrada no banco.' })
      return
    }

    const hash = (rows[0] as any).valor_hash as number

    const decifra = (texto: string, deslocamento: number): string => {
      return texto.split('').map(char => {
        if (/[a-z]/.test(char)) {
          return String.fromCharCode(((char.charCodeAt(0) - 97 - deslocamento + 26) % 26) + 97)
        }
        if (/[A-Z]/.test(char)) {
          return String.fromCharCode(((char.charCodeAt(0) - 65 - deslocamento + 26) % 26) + 65)
        }
        return char
      }).join('')
    }

    const mensagemOriginal = decifra(mensagemCriptografada, hash)

    req.body.hash = hash
    req.body.mensagemOriginal = mensagemOriginal
    next()
  } catch (err) {
    console.error('Erro no middleware de decifra:', err)
    res.status(500).json({ error: 'Erro interno ao descriptografar a mensagem.' })
  }
}
