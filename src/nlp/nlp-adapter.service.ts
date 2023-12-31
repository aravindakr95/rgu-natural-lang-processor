import { Injectable } from '@nestjs/common';
import {
  LanguageTranslatorV3,
  NaturalLanguageUnderstandingV1
} from 'ibm-watson/sdk';
import { IamAuthenticator } from 'ibm-watson/auth';
import {
  IdentifiedLanguage,
  TranslateParams
} from 'ibm-watson/language-translator/v3';

import projectConfig from '../../config';
import {ErrorResponse, LangResponse, Language, PrimaryRequest} from '../models';
import {max} from 'rxjs';

@Injectable()
export class NlpAdapterService {
  private nlProcessingInstance: NaturalLanguageUnderstandingV1;
  private langDetectInstance: LanguageTranslatorV3;

  constructor() {
    this.nlProcessingInstance = new NaturalLanguageUnderstandingV1({
      version: '2022-04-07',
      authenticator: new IamAuthenticator({
        apikey: projectConfig.ibm.nluToken,
      }),
      serviceUrl: projectConfig.ibm.nluInstanceUrl,
    });

    this.langDetectInstance = new LanguageTranslatorV3({
      version: '2018-05-01',
      authenticator: new IamAuthenticator({
        apikey: projectConfig.ibm.translateToken,
      }),
      serviceUrl: projectConfig.ibm.translateInstanceUrl,
    })
  }

  /**
   * Analyze the provided text paragraph and decide whether it was a negative, positive or neutral sentiment
   * @param req
   */
  async analyzeSentiment(req: PrimaryRequest): Promise<any> {
    try {
      const response = await this.nlProcessingInstance.analyze({
        text: req.text,
        features: {
          sentiment: {
            document: true,
          },
        },
      });

      return response.result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Extract keywords of the provided text paragraph
   * @param req
   */
  async extractKeywords(req: PrimaryRequest): Promise<string[]> {
    try {
      const response = await this.nlProcessingInstance.analyze({
        text: req.text,
        features: {
          keywords: {}
        }
      });

      const keywords = response.result.keywords.map(keyword => keyword.text);
      return keywords;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Detect language of the text and returns highest confidence language
   * @param req
   */
  async detectLanguage(req: PrimaryRequest): Promise<any> {
    try {
      let maxVal: IdentifiedLanguage = null;
      const response = await this.langDetectInstance.identify({ text: req.text });

      return response.result.languages.slice(0,3);

      // response.result.languages.forEach((data) => {
      //   if (maxVal === null) {
      //     maxVal = data;
      //   }

        // if (data.confidence > maxVal.confidence) {
        //   maxVal = data;
        // }
      // });

      // return { lang: maxVal.language, confidence: maxVal.confidence };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Identify the text language and translate into a source language
   * @param req
   */
  async translate(req: PrimaryRequest): Promise<Language> {
    try {
      const sourceLang = await this.detectLanguage({ text: req.text });

      if (sourceLang.lang) {
        const translateParams: TranslateParams = {
          text: [req.text],
          source: sourceLang.lang,
          target: req.targetLang,
        };

        const { result } = await this.langDetectInstance.translate(translateParams);
        return { text: result.translations[0].translation, lang: req.targetLang };
      }
    } catch (error) {
      throw error;
    }
  }
}
