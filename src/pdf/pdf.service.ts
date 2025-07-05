import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { Buffer } from 'buffer';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  /**
   * Gera um buffer de PDF a partir de um conteúdo HTML.
   * @param htmlContent O conteúdo HTML a ser renderizado.
   * @returns Uma Promise que resolve para o buffer do PDF gerado.
   */
  async createPdfFromHtml(htmlContent: string): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;
    try {
      this.logger.log('Iniciando a geração do PDF...');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const pdfBuffer = Buffer.from(
        await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px',
          },
        }),
      );

      this.logger.log('PDF gerado com sucesso.');
      return pdfBuffer;
    } catch (error) {
      this.logger.error('Falha ao gerar o PDF.', error.stack);
      throw new InternalServerErrorException('Não foi possível gerar o relatório em PDF.');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}