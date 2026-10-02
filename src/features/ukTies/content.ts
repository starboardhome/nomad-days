/**
 * Plain-English questions and explanations for the UK sufficient ties test.
 * Based on HMRC's Statutory Residence Test guidance (RDR3) and Finance Act 2013, Schedule 45.
 */
import type { UkAnswers } from '../../domain/ukTies';

export type Info = Readonly<{ title: string; paragraphs: readonly string[] }>;
export type Question = Readonly<{ key: keyof UkAnswers; question: string; info: Info }>;

export const SOURCES = [
  { label: 'HMRC: Statutory Residence Test guidance (RDR3)', url: 'https://www.gov.uk/government/publications/rdr3-statutory-residence-test-srt' },
  { label: 'GOV.UK: UK residence and tax', url: 'https://www.gov.uk/tax-foreign-income/residence' },
];

export const INTRO =
  'Under 183 days a tax year, you can still become UK tax resident if you have enough ties to the UK. The more days you spend there, the fewer ties it takes. Answer yes or no, and tap ⓘ for the details.';

export const QUESTIONS: readonly Question[] = [
  {
    key: 'leaver',
    question: 'Were you UK tax resident in any of the 3 previous tax years?',
    info: {
      title: 'Leaver or arriver',
      paragraphs: [
        'The number of ties you need depends on whether you were UK resident in any of the 3 tax years before this one.',
        'Yes ("leaver"): 16–45 days in the UK needs 4 ties, 46–90 days needs 3, 91–120 days needs 2, and 121–182 days needs 1.',
        'No ("arriver"): under 46 days you are not resident. 46–90 days needs all 4 ties, 91–120 days needs 3, and 121–182 days needs 2.',
        'Fewer than 16 days (leavers) or 46 days (arrivers) in a tax year means you are not UK resident. 183 days or more always means you are.',
      ],
    },
  },
  {
    key: 'family',
    question: 'Does your partner, or a child under 18, live in the UK and count as UK resident this tax year?',
    info: {
      title: 'Family tie',
      paragraphs: [
        'You have a family tie if any of these people is UK resident for the tax year: your husband, wife or civil partner (unless you are separated), a partner you live with as a couple, or your child under 18.',
        'A child does not count if you spend time with them in the UK on fewer than 61 days in the tax year (or in the part of it before they turn 18).',
        'A child in full-time education in the UK is not treated as UK resident for this if they spend fewer than 21 days in the UK outside term time.',
        'If your partner is only UK resident because of their ties to you, special rules apply. See HMRC’s guidance.',
      ],
    },
  },
  {
    key: 'accommodation',
    question: 'Do you have a place to live in the UK for 91+ days in a row this tax year, and stay there at least one night?',
    info: {
      title: 'Accommodation tie',
      paragraphs: [
        'It can be a home you own or rent, a holiday home, or somewhere you can stay whenever you like, such as a friend’s flat. It does not have to be your home in the everyday sense.',
        'It must be available to you for at least 91 days in a row in the tax year. Gaps of fewer than 16 days don’t break the run.',
        'You must spend at least one night there in the tax year.',
        'If it is the home of a close relative (parent, grandparent, brother or sister, or adult child or grandchild), you need to spend at least 16 nights there.',
        'A hotel or guest house room booked for 91 days or more in a row can also count.',
      ],
    },
  },
  {
    key: 'work',
    question: 'Will you work in the UK for more than 3 hours a day on at least 40 days this tax year?',
    info: {
      title: 'Work tie',
      paragraphs: [
        'You have a work tie if you work in the UK for more than 3 hours a day on at least 40 days in the tax year, as an employee or self-employed.',
        'The days do not have to be in a row. Work includes training, and some work-related travel time.',
        'Special rules apply to some cross-border transport workers, such as aircrew and ships’ crew.',
      ],
    },
  },
  {
    key: 'ninetyDays',
    question: 'Did you spend more than 90 days in the UK in either of the last 2 tax years?',
    info: {
      title: '90-day tie',
      paragraphs: [
        'You have a 90-day tie if you spent more than 90 days in the UK in either (or both) of the 2 previous tax years.',
        'Days are counted the same way as for the 183-day test: a day counts if you are in the UK at midnight.',
        'Nomad Days works this out from your trips. Answer Yes if you spent more than 90 days in the UK before you started logging trips here.',
      ],
    },
  },
];

export const COUNTRY_TIE: Info = {
  title: 'Country tie (leavers only)',
  paragraphs: [
    'If you were UK resident in any of the 3 previous tax years, you have a country tie when the UK is the country where you spent the most midnights this tax year. Being level with another country also counts.',
    'Nomad Days works this out from your trips so far this tax year, so it can change as the year goes on.',
    'It doesn’t apply if you weren’t UK resident in any of the 3 previous tax years.',
  ],
};

export const LIMITS: Info = {
  title: 'What this doesn’t cover',
  paragraphs: [
    'Nomad Days models the automatic 183-day test and the sufficient ties test.',
    'It doesn’t model the other automatic tests (for example working full-time abroad, or having your only home in the UK), split-year treatment, or days that don’t count (some transit and exceptional-circumstance days).',
    'These are estimates. If you are close to a limit, check HMRC’s guidance or get professional advice.',
  ],
};
