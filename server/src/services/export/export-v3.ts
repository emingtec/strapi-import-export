import { getAllSlugs } from '../../utils/models';
import { CustomSlugs, CustomSlugToSlug } from '../../config/constants.js';
import { buildFilterQuery } from '../../utils/query';
import { ExportContext } from './utils/export-context';
import { ExportProcessor } from './utils/export-processor';

export interface ExportV3Options {
  slug: string;
  search: string;
  applySearch: boolean;
  exportPluginsContentTypes: boolean;
  documentIds?: string[];
  maxDepth?: number;
  exportAllLocales?: boolean;
  exportRelations?: boolean;
  deepPopulateRelations?: boolean;
  deepPopulateComponentRelations?: boolean;
}

export async function exportDataV3({
   slug,
   search,
   applySearch,
   exportPluginsContentTypes,
   documentIds,
   maxDepth = 20,
   exportAllLocales = true,
   exportRelations = false,
   deepPopulateRelations = false,
   deepPopulateComponentRelations = false,
 }: ExportV3Options): Promise<string> {
  const slugsToExport =
    slug === CustomSlugs.WHOLE_DB ?
      getAllSlugs({ includePluginsContentTypes: exportPluginsContentTypes }) :
      [CustomSlugToSlug[slug] || slug];

  const searchParams = applySearch ? buildFilterQuery(search) : {};

  const context = new ExportContext({
    documentIds,
    applySearch,
    search: searchParams,
    exportAllLocales,
    exportRelations,
    skipRelations: false,
    skipComponentRelations: false,
  });

  console.log('Skip relations', deepPopulateRelations === false, deepPopulateComponentRelations === false);

  const processor = new ExportProcessor(context, {
    documents: strapi.documents,
  });

  for (const currentSlug of slugsToExport) {
    await processor.processSchema(currentSlug);
  }

  console.log('FIRST RELATIONS:', context.getRelations());

  context.setSkipRelations(deepPopulateRelations === false);
  context.setSkipComponentRelations(deepPopulateComponentRelations === false);

  let loopCount = 0;
  while (Object.keys(context.getRelations()).length > 0 && exportRelations && loopCount < maxDepth) {
    const nextRelations = context.getRelations();
    context.clearRelations();

    for (const [key, documentIds] of Object.entries(nextRelations)) {
      console.log('PROCESSING RELATIONS FOR', key);
      console.log('DOCUMENT IDS', documentIds);
      context.setDocumentIds(documentIds);
      await processor.processSchema(key);
    }

    context.processedRelations[loopCount] = nextRelations;
    loopCount++;
  }

  return JSON.stringify({
    version: 3,
    data: context.exportedData,
  }, null, '\t');
}
