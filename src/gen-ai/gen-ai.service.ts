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

  /**
   * Gera um resumo conciso para o comitê de equalização.
   */
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

  async extractBrutalFacts(data: EqualizationResponseDto): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
      Você é um coach de carreira e mentor experiente. Sua tarefa é extrair os "Brutal Facts" (a verdade nua e crua, mas construtiva) da avaliação de "${data.collaboratorName}" para ajudar seu mentor a preparar uma sessão de feedback eficaz.

      **Dados Consolidados:**
      - **Avaliações por Critério:**
      ${data.consolidatedCriteria.map(c => `
        - Critério: "${c.criterionName}" | Auto: ${c.selfEvaluation?.score ?? 'N/A'} | Líder: ${c.leaderEvaluation?.score ?? 'N/A'} | Pares (média): ${c.peerEvaluation?.score ?? 'N/A'}
      `).join('')}
      - **Feedbacks de Pares:**
      ${data.peerFeedbacks.length > 0 ? data.peerFeedbacks.map(f => `  - De ${f.evaluatorName}: (Melhorar: "${f.pointsToImprove}"; Explorar: "${f.pointsToExplore}")`).join('\n') : 'N/A'}

      **Instruções:**
      1.  **Seja direto e empático.** Identifique no máximo 2 ou 3 temas críticos que emergem da análise cruzada dos dados.
      2.  Foque em lacunas de performance (onde as notas do líder/pares são baixas) e em lacunas de percepção (onde a autoavaliação é muito diferente da dos outros).
      3.  Use os "pontos a melhorar" dos pares para dar substância aos "Brutal Facts".
      4.  Transforme os dados em pontos de ação/reflexão para o mentor abordar, não apenas numa lista de problemas.
      5. divida nesses pontos:
        -Pontos Fortes,
        -Pontos Fracos 
        -Plano de Ação,
        -Recomendações Finais

      Agora, gere os "Brutal Facts" para "${data.collaboratorName}":
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
}