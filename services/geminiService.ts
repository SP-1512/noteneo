import { GoogleGenerativeAI } from "@google/generative-ai"

const apiKey = import.meta.env.VITE_GEMINI_API_KEY

const genAI = new GoogleGenerativeAI(apiKey)

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash"
})

export async function generateNoteSummary(content: string) {
  const prompt = `
Summarize the following study notes clearly.
Also return 5–8 key bullet points.

Respond in JSON:
{
  "summary": string,
  "keyPoints": string[]
}

NOTES:
${content.slice(0, 15000)}
`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  try {
    return JSON.parse(text)
  } catch {
    return {
      summary: text,
      keyPoints: []
    }
  }
}

export async function askNoteQuestion(question: string, context: string) {
  const prompt = `
Based on the notes below, answer the question clearly and concisely.

NOTES:
${context.slice(0, 12000)}

QUESTION:
${question}
`

  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function assessNoteQuality(content: string) {
  const prompt = `
Evaluate the quality of the following study notes.
Give a score from 1 to 100 and brief feedback.

Respond in JSON:
{
  "score": number,
  "feedback": string
}

NOTES:
${content.slice(0, 12000)}
`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  try {
    return JSON.parse(text)
  } catch {
    return {
      score: 70,
      feedback: text
    }
  }
}
export async function explainSelection(text: string) {
  const prompt = `
Explain the following study content in a simple and clear way,
as if teaching a student.

CONTENT:
${text.slice(0, 8000)}
`

  const result = await model.generateContent(prompt)
  return result.response.text()
}
export async function generateFlashcards(content: string) {
  const prompt = `
Create 5–10 flashcards from the notes below.

Respond in JSON:
[
  { "question": string, "answer": string }
]

NOTES:
${content.slice(0, 12000)}
`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  try {
    return JSON.parse(text)
  } catch {
    return []
  }
}
export async function generateQuiz(content: string) {
  const prompt = `
Create a short quiz from the notes below.

Respond in JSON:
[
  {
    "question": string,
    "options": string[],
    "correctAnswer": string
  }
]

NOTES:
${content.slice(0, 12000)}
`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  try {
    return JSON.parse(text)
  } catch {
    return []
  }
}
export async function validateNoteContent(content: string) {
  const prompt = `
Check the following notes for factual issues, hallucinations,
or poor academic quality.

Respond in JSON:
{
  "isValid": boolean,
  "issues": string[]
}

NOTES:
${content.slice(0, 12000)}
`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  try {
    return JSON.parse(text)
  } catch {
    return {
      isValid: true,
      issues: []
    }
  }
}
