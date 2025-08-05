import { ITag, IAssetData } from 'roundware-web-framework';

// all the reusable types here
export interface ITagLookup {
	[id: number]: ITag | undefined;
}
export interface ISelectedTags {
	[group_key: string]: number[]; // tag_ids
}

export interface IMatch {
	params: {
		tagGroupIndex?: string;
	};
	path: string;
}
export type IImageAsset = IAssetData;
export type ITextAsset = string;

// Color parsing result type
export interface ParsedColor {
	/** The color without alpha channel */
	color: string;
	/** Alpha value from 0-1, or null if no alpha channel */
	alpha: number | null;
	/** Whether the original color included an alpha channel */
	hasAlpha: boolean;
}
