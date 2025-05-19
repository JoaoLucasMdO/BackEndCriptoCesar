import express from 'express'
import { promisePool } from './db/db'
import { cifraDeCesarMiddleware } from './middleware/cesarMiddleware'
import { decifraMiddleware } from './middleware/decifraCesarMiddleware'

const app = express()
app.use(express.json())

// 🔐 Endpoint para criptografar uma mensagem
app.post('/criptografar', cifraDeCesarMiddleware, (req, res) => {
  const { mensagemCriptografada } = req.body
  res.json({ mensagemCriptografada })
})

// 🔓 Endpoint para descriptografar uma mensagem
app.post('/descriptografar', decifraMiddleware, (req, res) => {
  const { mensagemOriginal, hash } = req.body
  res.json({ mensagemOriginal, hash })
})

// 👤 Endpoint para cadastro de usuário
app.post('/cadastrar', async (req, res): Promise<void> => {
  const { nome, senha } = req.body

  if (!nome || !senha) {
    res.status(400).json({ error: 'Nome e senha são obrigatórios.' })
    return
  }

  try {
    const [rows] = await promisePool.query('SELECT * FROM usuarios WHERE nome = ?', [nome])

    if (Array.isArray(rows) && rows.length > 0) {
      res.status(409).json({ error: 'Nome de usuário já está em uso.' })
      return
    }

    const [result] = await promisePool.query(
      'INSERT INTO usuarios (nome, senha) VALUES (?, ?)',
      [nome, senha]
    )

    res.status(201).json({
      message: 'Usuário cadastrado com sucesso.',
      usuario_id: (result as any).insertId,
    })
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err)
    res.status(500).json({ error: 'Erro interno ao cadastrar usuário.' })
  }
})

// 🔑 Endpoint para login de usuário
app.post('/login', async (req, res): Promise<void> => {
  const { nome, senha } = req.body

  if (!nome || !senha) {
    res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' })
    return
  }

  try {
    const [rows] = await promisePool.query(
      'SELECT * FROM usuarios WHERE nome = ? LIMIT 1',
      [nome]
    )

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(401).json({ error: 'Nome de usuário ou senha inválidos.' })
      return
    }

    const usuario = rows[0] as any
    if (usuario.senha !== senha) {
      res.status(401).json({ error: 'Nome de usuário ou senha inválidos.' })
      return
    }

    res.status(200).json({
      message: 'Login realizado com sucesso.',
      usuario_id: usuario.id
    })
  } catch (err) {
    console.error('Erro no login:', err)
    res.status(500).json({ error: 'Erro interno ao realizar o login.' })
  }
})

app.get('/mensagens/:usuario_id', async (req, res): Promise<void> => {
  const usuario_id = Number(req.params.usuario_id)

  if (isNaN(usuario_id)) {
    res.status(400).json({ error: 'ID de usuário inválido.' })
    return
  }

  try {
    const [rows] = await promisePool.query(
      'SELECT id, mensagem, valor_hash FROM mensagens WHERE usuario_id = ?',
      [usuario_id]
    )

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(404).json({ error: 'Nenhuma mensagem encontrada para este usuário.' })
      return
    }

    res.status(200).json({
      mensagens: rows.map((row: any) => ({
        id: row.id,
        mensagemCriptografada: row.mensagem,
        hash: row.valor_hash
      }))
    })
  } catch (err) {
    console.error('Erro ao buscar mensagens:', err)
    res.status(500).json({ error: 'Erro interno ao buscar mensagens.' })
  }
})

// 🚀 Inicialização do servidor
app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000')
})
