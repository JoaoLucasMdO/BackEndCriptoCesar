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
    // 🔍 Verifica se o hash já está vinculado a esse usuário
    const [hashRows] = await promisePool.query(
      'SELECT * FROM usuarios WHERE id = ? AND valor_hash = ? LIMIT 1',
      [usuario_id, hash]
    )

    if (Array.isArray(hashRows) && hashRows.length > 0) {
      // Se o hash já estiver vinculado ao usuário, seguimos com a criptografia
      console.log('Hash já vinculado ao usuário. Continuando com a criptografia.')
    } else {
      // Se o hash não estiver vinculado ao usuário, verificamos se o hash existe na tabela hashes
      const [existingHash] = await promisePool.query(
        'SELECT * FROM hashes WHERE valor_hash = ? LIMIT 1',
        [hash]
      )

      if (Array.isArray(existingHash) && existingHash.length === 0) {
        // Se o hash não existir, adicionamos na tabela de hashes
        const [hashInsertResult] = await promisePool.query(
          'INSERT INTO hashes (valor_hash) VALUES (?)',
          [hash]
        )

        console.log('Hash inserido na tabela de hashes.')
      }

      // Agora vincula o hash ao usuário
      await promisePool.query(
        'UPDATE usuarios SET valor_hash = ? WHERE id = ?',
        [hash, usuario_id]
      )

      console.log('Hash vinculado ao usuário.')
    }

    // 🔐 Função de criptografia (César)
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

    // Define no body para a próxima rota usar
    req.body.mensagemCriptografada = mensagemCriptografada
    next()
  } catch (err) {
    console.error('Erro no middleware de cifra:', err)
    res.status(500).json({ error: 'Erro interno ao criptografar a mensagem.' })
    return
  }
}
