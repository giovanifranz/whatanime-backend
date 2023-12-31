import { Injectable } from '@nestjs/common';

import { Either, left, right } from '@/core/either';
import { UseCase } from '@/core/entities/use-case.abstract';
import { AnimeSchema } from '@/domain/application/schemas/anime.schema';
import { QuoteSchema } from '@/domain/application/schemas/quote.schema';
import { Anime } from '@/domain/enterprise/entities/anime.entity';
import { Quote } from '@/domain/enterprise/entities/quote.entity';
import { AnimeFactory } from '@/domain/enterprise/factories/anime.factory';
import { QuoteFactory } from '@/domain/enterprise/factories/quote.factory';
import { AnimeClient } from '@/infra/http/rest/clients/anime.client';
import { QuoteClient } from '@/infra/http/rest/clients/quote.client';

interface GetAnimeByTitleUseCaseRequest {
  title: string;
}
type GetAnimeByTitleUseCaseResponse = Either<
  Error,
  {
    data: Anime[];
    pagination: {
      has_next_page: boolean;
      current_page: number;
    };
  }
>;

@Injectable()
export class GetAnimeByTitleUseCase
  implements UseCase<GetAnimeByTitleUseCaseRequest, GetAnimeByTitleUseCaseResponse>
{
  constructor(
    private readonly animeClient: AnimeClient,
    private readonly quoteClient: QuoteClient,
  ) {}

  async execute({
    title,
  }: GetAnimeByTitleUseCaseRequest): Promise<GetAnimeByTitleUseCaseResponse> {
    const [resolvedAnime, resolvedQuote] = await Promise.allSettled([
      this.animeClient.getAnimesByTitle(title),
      this.quoteClient.getAnimesQuoteByTitle(title),
    ]);

    if (resolvedAnime.status === 'rejected') {
      return left(new Error('Anime by title not found'));
    }

    const quotes: Quote[] = [];

    if (resolvedQuote.status === 'fulfilled') {
      resolvedQuote.value.data.forEach((quote) => {
        const parsedQuote = QuoteSchema.safeParse(quote);
        if (!parsedQuote.success) return;

        quotes.push(QuoteFactory.create(parsedQuote.data));
      });
    }

    const animes: Anime[] = [];

    resolvedAnime.value.data.data.forEach((anime) => {
      const parsedAnime = AnimeSchema.safeParse(anime);
      if (!parsedAnime.success) return;

      animes.push(
        AnimeFactory.create({
          quotes,
          ...parsedAnime.data,
        }),
      );
    });

    return right({
      data: animes,
      pagination: {
        has_next_page: resolvedAnime.value.data.pagination.has_next_page,
        current_page: resolvedAnime.value.data.pagination.current_page,
      },
    });
  }
}
