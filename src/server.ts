import express from 'express'
import { promisePool } from './db/db'
import { cifraDeCesarMiddleware } from './middleware/cesarMiddleware'

const app = express()
app.use(express.json())

// Endpoint para criptografar
app.post('/criptografar', cifraDeCesarMiddleware, (req, res) => {
  const { mensagemCriptografada } = req.body
  res.json({ mensagemCriptografada })
})

// Endpoint para descriptografar
app.post('/descriptografar', async (req, res): Promise<void> => {
    const { mensagemCriptografada } = req.body
  
    if (typeof mensagemCriptografada !== 'string') {
      res.status(400).json({ error: 'Esperado: mensagemCriptografada (string).' })
      return
    }
  
    try {
      // Buscar o hash correspondente à mensagem
      const [rows] = await promisePool.query(
        'SELECT valor_hash FROM mensagens WHERE mensagem = ? LIMIT 1',
        [mensagemCriptografada]
      )
  
      if (!Array.isArray(rows) || rows.length === 0) {
        res.status(404).json({ error: 'Mensagem criptografada não encontrada no banco.' })
        return
      }
  
      const hash = (rows[0] as any).valor_hash as number
  
      // Função de descriptografia (César reversa)
      const decifra = (text: string, shift: number): string => {
        return text.split('').map(char => {
          if (/[a-z]/.test(char)) {
            return String.fromCharCode(((char.charCodeAt(0) - 97 - shift + 26) % 26) + 97)
          }
          if (/[A-Z]/.test(char)) {
            return String.fromCharCode(((char.charCodeAt(0) - 65 - shift + 26) % 26) + 65)
          }
          return char
        }).join('')
      }
  
      const mensagemOriginal = decifra(mensagemCriptografada, hash)
  
      res.json({ mensagemOriginal, hash })
    } catch (err) {
      console.error('Erro ao descriptografar:', err)
      res.status(500).json({ error: 'Erro interno ao descriptografar a mensagem.' })
    }
  });
  

  app.post('/cadastrar', async (req, res): Promise<void> => {
    const { nome, senha } = req.body
  
    if (!nome || !senha) {
      res.status(400).json({ error: 'Nome e senha são obrigatórios.' })
      return 
    }
  
    try {
      // Verifica se já existe o usuário
      const [rows] = await promisePool.query('SELECT * FROM usuarios WHERE nome = ?', [nome])
  
      if (Array.isArray(rows) && rows.length > 0) {
         res.status(409).json({ error: 'Nome de usuário já está em uso.' })
         return
      }
  
      // Cadastra novo usuário
      const [result] = await promisePool.query(
        'INSERT INTO usuarios (nome, senha) VALUES (?, ?)',
        [nome, senha]
      )
  
       res.status(201).json({
        message: 'Usuário cadastrado com sucesso.',
        usuario_id: (result as any).insertId,
      })
      return
    } catch (err) {
        console.error('Erro ao cadastrar usuário:', err)
        res.status(500).json({ error: 'Erro interno ao cadastrar usuário.' })
      return 
    }
  })

  app.post('/login', async (req, res): Promise<void> => {
    const { nome, senha } = req.body
  
    // Verifica se o nome de usuário e a senha foram fornecidos
    if (!nome || !senha) {
       res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' })
       return
    }
  
    try {
      // Verifica se o usuário existe no banco de dados
      const [rows] = await promisePool.query(
        'SELECT * FROM usuarios WHERE nome = ? LIMIT 1',
        [nome]
      )
  
      // Se o usuário não for encontrado
      if (!Array.isArray(rows) || rows.length === 0) {
         res.status(401).json({ error: 'Nome de usuário ou senha inválidos.' })
         return
      }
  
      // Verifica se a senha fornecida é válida
      const usuario = rows[0] as any
      if (usuario.senha !== senha) {
        res.status(401).json({ error: 'Nome de usuário ou senha inválidos.' })
        return
      }
  
      // Caso de sucesso: retorno do ID do usuário junto com a mensagem
       res.status(200).json({
        message: 'Login realizado com sucesso.',
        usuario_id: usuario.id
      })
      return
    } catch (err) {
      console.error('Erro no login:', err)
       res.status(500).json({ error: 'Erro interno ao realizar o login.' })
       return
    }
  })



app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000')
})
