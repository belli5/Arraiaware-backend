import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EqualizationResponseDto } from '../rh/dto/equalization-response.dto';

@Injectable()
export class GenAIService {
  private readonly logger = new Logger(GenAIService.name);
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY não foi configurada nas variáveis de ambiente.');
      throw new InternalServerErrorException('API Key para o serviço de GenAI não encontrada.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }
  async generateEqualizationSummary(data: EqualizationResponseDto): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Você é um especialista em RH analisando dados de auto-avaliaçõe, avaliações 360 e pesquisas de referência de desempenho 360 para o colaborador "${data.collaboratorName}" no ciclo "${data.cycleName}".
      Sua tarefa é criar um resumo conciso e analítico para o comitê de equalização.

      **Dados por Critério:**
      ${data.consolidatedCriteria.map(c => `
      - Critério: "${c.criterionName}"
        - Autoavaliação: ${c.selfEvaluation?.score ?? 'N/A'} (Justificativa: ${c.selfEvaluation?.justification ?? 'N/A'})
        - Avaliação do Líder: ${c.leaderEvaluation?.score ?? 'N/A'} (Justificativa: ${c.leaderEvaluation?.justification ?? 'N/A'})
        - Média dos Pares (Nota Geral): ${c.peerEvaluation?.score ?? 'N/A'}
        - **Discrepância Notável:** ${c.hasDiscrepancy ? 'SIM' : 'NÃO'}
      `).join('')}

      **Feedback Qualitativo dos Pares (360):**
      ${data.peerFeedbacks.length > 0 ? data.peerFeedbacks.map(f => `
      - Feedback de ${f.evaluatorName}:
        - Pontos a melhorar: "${f.pointsToImprove}"
        - Pontos a explorar: "${f.pointsToExplore}"
      `).join('') : 'Nenhum feedback de pares foi submetido.'}

      **Justificativas de Referência:**
      ${data.referenceFeedbacks.length > 0 ? data.referenceFeedbacks.map(f => `
      - Indicado por ${f.indicatedName}: "${f.justification}"
      `).join('') : 'Nenhuma indicação de referência foi submetida.'}

      **Instruções:**
      1.  **Faça um resumo bem completo** .
      2.  Integre todas as fontes de dados (critérios, feedback de pares e referências) para formar uma visão holística.
      3.  Destaque os principais pontos fortes onde há consenso.
      4.  Aponte as principais áreas de desenvolvimento, usando as justificativas dos pares e do líder para dar contexto às discrepâncias de notas.
      5.  O tom deve ser profissional e analítico, focado em facilitar a tomada de decisão do comitê.
      6.  cite os nomes dos referenciadores, mas evite expor feedbacks pessoais de forma direta.
      7. divida nesses pontos:
        -Pontos Fortes,
        -Pontos Fracos 
        -Plano de Ação,
        -Recomendações Finais
    
      Agora, gere o resumo para o colaborador "${data.collaboratorName}":
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      this.logger.error('Erro ao gerar resumo com GenAI:', error);
      throw new InternalServerErrorException('Falha ao gerar o resumo da avaliação.');
    }
  }

  async extractBrutalFacts(data: any): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    

    const leaderJustification = data.leaderEvaluation?.justification ?? 'N/A';
    const peerFeedbacksText = data.peerFeedbacks?.length > 0
      ? data.peerFeedbacks.map(f => `- Pontos a Melhorar: "${f.pointsToImprove}"\n  - Pontos a Explorar: "${f.pointsToExplore}"`).join('\n')
      : 'Nenhum feedback de pares fornecido.';

    const prompt = `
      Você é um especialista em análise de desempenho de RH. Sua tarefa é criar um resumo breve e objetivo sobre a avaliação de performance de "${data.collaboratorName}".

      **Contexto:**
      - **Colaborador Avaliado:** ${data.collaboratorName}
      - **Ciclo de Avaliação:** ${data.cycleName}
      - **Fontes de Dados:** Avaliação do Líder e Avaliações de Pares (360).

      **Dados de Avaliação:**
      - **Nota do Líder (média):** ${data.leaderEvaluationScore ?? 'N/A'}
      - **Nota dos Pares (média):** ${data.peerEvaluationScore ?? 'N/A'}
      - **Feedbacks Qualitativos (Pares):**
        ${peerFeedbacksText}
      - **Justificativa do Líder:** ${leaderJustification}

      **Instruções:**
      Com base nos dados fornecidos, gere um resumo que contenha estritamente os seguintes tópicos:

      1.  **Pontos Positivos:**
          -   Faça um resumo dos principais elogios e pontos fortes, combinando as notas altas e os feedbacks positivos dos pares ("pontos a explorar") e do líder. Seja direto.

      2.  **Pontos de Melhoria (Negativos):**
          -   Faça um resumo das principais críticas e áreas para desenvolvimento, combinando as notas mais baixas e os feedbacks de "pontos a melhorar" dos pares e as justificativas do líder. Seja direto e construtivo.

      O resumo deve ser conciso e focado em fornecer uma visão clara do desempenho, sem incluir planos de ação ou recomendações extensas.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      this.logger.error('Erro ao extrair Brutal Facts com GenAI:', error);
      throw new InternalServerErrorException('Falha ao extrair os insights da avaliação.');
    }
  }

    async generatePdiSuggestions(evaluationData: any): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Você é um coach de carreira e especialista em RH. Baseado nos dados da autoavaliação a seguir, gere sugestões de Plano de Desenvolvimento Individual (PDI).

      **Dados da Autoavaliação:**
      ${JSON.stringify(evaluationData, null, 2)}

      **Instruções:**
      1. Identifique 2-3 áreas principais para desenvolvimento, focando nos critérios com as menores notas e nas justificativas.
      2. Para cada área, sugira ações concretas (ex: cursos, livros, projetos práticos, busca por mentoria).
      3. O tom deve ser construtivo e encorajador.
      4. As sugestões devem ser realistas e focadas no crescimento profissional do colaborador.

      Gere as sugestões de PDI em formato de lista (markdown).
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      this.logger.error('Erro ao gerar sugestões de PDI com GenAI:', error);
      throw new InternalServerErrorException('Falha ao gerar sugestões para o PDI.');
    }
  }
}