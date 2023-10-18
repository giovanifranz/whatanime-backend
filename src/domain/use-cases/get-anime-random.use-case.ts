import { Injectable } from '@nestjs/common';

import { Either, left, right } from '@/core/either';
import { UseCase } from '@/core/entities/use-case.abstract';
import { AnimeClient } from '@/infra/http/rest/clients/anime.client';
import { QuoteClient } from '@/infra/http/rest/clients/quote.client';

import { Anime } from '../entities/anime.entity';
import { Quote } from '../entities/quote.entity';
import { AnimeFactory } from '../factories/anime.factory';
import { QuoteFactory } from '../factories/quote.factory';
import { AnimeSchema } from '../schemas/anime.schema';
import { QuoteSchema } from '../schemas/quote.schema';

interface GetAnimeRandomUseCaseRequest {}
type GetAnimeRandomUseCaseResponse = Either<Error, Anime>;

@Injectable()
export class GetAnimeRandomUseCase
  implements UseCase<GetAnimeRandomUseCaseRequest, GetAnimeRandomUseCaseResponse>
{
  constructor(
    private readonly animeClient: AnimeClient,
    private readonly quoteClient: QuoteClient,
  ) {}

  async execute(): Promise<GetAnimeRandomUseCaseResponse> {
    const animeResponse = await this.animeClient
      .getAnimeRandom()
      .then(({ data: response }) => response.data)
      .catch(() => null);

    if (!animeResponse) {
      return left(new Error('Random anime not found'));
    }

    const parsedAnime = AnimeSchema.safeParse(animeResponse);

    if (!parsedAnime.success) {
      return left(new Error('Failed to parse random anime'));
    }

    const quotes: Quote[] = await this.quoteClient
      .getAnimesQuoteByTitle(parsedAnime.data.title)
      .then(({ data }) => {
        if (!data) return [];

        const quotes: Quote[] = [];

        data.forEach((quote) => {
          const parsedQuote = QuoteSchema.safeParse(quote);
          if (!parsedQuote.success) return;

          quotes.push(QuoteFactory.create(parsedQuote.data));
        });

        return quotes;
      })
      .catch(() => []);

    const animeRandom = AnimeFactory.create({
      quotes,
      ...parsedAnime.data,
    });

    return right(animeRandom);
  }
}