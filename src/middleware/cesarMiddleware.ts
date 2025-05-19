import { Request, Response, NextFunction } from 'express'
import { promisePool } from '../db/db'

export const cifraDeCesarMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { hash, mensagem, usuario_id } = req.body

  if (typeof hash !== 'number' || typeof mensagem !== 'string' || typeof usuario_id !== 'number') {
    res.status(400).json({
      error: 'Esperado: hash (number), mensagem (string) e usuario_id (number).'
    })
    return
  }

  try {
    // 🔐 Função de criptografia (Cifra de César)
    const cifra = (texto: string, deslocamento: number): string => {
      return texto.split('').map(char => {
        if (/[a-z]/.test(char)) {
          return String.fromCharCode(((char.charCodeAt(0) - 97 + deslocamento) % 26) + 97)
        }
        if (/[A-Z]/.test(char)) {
          return String.fromCharCode(((char.charCodeAt(0) - 65 + deslocamento) % 26) + 65)
        }
        return char
      }).join('')
    }

    const mensagemCriptografada = cifra(mensagem, hash)

    // 💾 Salva a mensagem criptografada no banco de dados
    await promisePool.query(
      'INSERT INTO mensagens (mensagem, valor_hash, usuario_id) VALUES (?, ?, ?)',
      [mensagemCriptografada, hash, usuario_id]
    )

    // Adiciona a mensagem criptografada ao request para uso posterior
    req.body.mensagemCriptografada = mensagemCriptografada
    next()
  } catch (err) {
    console.error('Erro no middleware de cifra:', err)
    res.status(500).json({ error: 'Erro interno ao criptografar a mensagem.' })
    return
  }
}
