import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	boostspaceApiRequest,
	buildFilterString,
	customFieldsToApiFormat,
	flattenCustomFields,
	formatBulkRecords,
	mapFieldType,
	parseCustomFieldsInput,
	parseDateFields,
	processBulkResponse,
} from './GenericFunctions';

import { recordOperations, recordFields } from './descriptions/RecordDescription';
import { spaceOperations, spaceFields } from './descriptions/SpaceDescription';
import { customModuleOperations, customModuleFields } from './descriptions/CustomModuleDescription';
import { fieldOperations, fieldFields } from './descriptions/FieldDescription';
import { apiCallOperations, apiCallFields } from './descriptions/ApiCallDescription';

export class Boostspace implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Boost.space',
		name: 'boostspace',
		icon: 'file:boostspace.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Boost.space API',
		defaults: { name: 'Boost.space' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{ name: 'boostspaceApi', required: true },
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'API Call', value: 'apiCall' },
					{ name: 'Custom Module', value: 'customModule' },
					{ name: 'Field', value: 'field' },
					{ name: 'Record', value: 'record' },
					{ name: 'Space', value: 'space' },
				],
				default: 'record',
			},
			...recordOperations,
			...recordFields,
			...spaceOperations,
			...spaceFields,
			...customModuleOperations,
			...customModuleFields,
			...fieldOperations,
			...fieldFields,
			...apiCallOperations,
			...apiCallFields,
		],
	};

	methods = {
		loadOptions: {
			async getCustomModules(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await boostspaceApiRequest.call(this, 'GET', '/api/custom-module');
				return (response as IDataObject[]).map((item: IDataObject) => ({
					name: `${item.name} (ID: ${item.id})`,
					value: item.id as number,
				}));
			},

			async getSpaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const qs: IDataObject = { modul: 'custom-module-item' };
				const customModuleId = this.getCurrentNodeParameter('customModuleId') as number | undefined;
				if (customModuleId) {
					qs.filter = `customModuleId=${customModuleId}`;
				}
				const response = await boostspaceApiRequest.call(this, 'GET', '/api/space', {}, qs);
				return (response as IDataObject[]).map((item: IDataObject) => ({
					name: `${item.name} (ID: ${item.id})`,
					value: item.id as number,
				}));
			},

			async getStatusSystems(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await boostspaceApiRequest.call(
					this, 'GET', '/api/status-system', {}, { modul: 'custom-module-item' },
				);
				return (response as IDataObject[]).map((item: IDataObject) => ({
					name: String(item.name),
					value: item.id as number,
				}));
			},

			async getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const spaceId = this.getCurrentNodeParameter('spaceId') as number | undefined;
				const qs: IDataObject = {};
				if (spaceId) {
					qs.space = spaceId;
				}
				const response = await boostspaceApiRequest.call(this, 'GET', '/api/label', {}, qs);
				return (response as IDataObject[]).map((item: IDataObject) => ({
					name: String(item.name),
					value: item.id as number,
				}));
			},

			async getCustomFieldInputs(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await boostspaceApiRequest.call(this, 'GET', '/api/custom-field/input');
				return (response as IDataObject[])
					.filter((item: IDataObject) => item.protected === false)
					.map((item: IDataObject) => ({
						name: `${item.name} (ID: ${item.id})`,
						value: item.id as number,
					}));
			},

			async getElementGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await boostspaceApiRequest.call(
					this, 'GET', '/api/custom-field', {}, { filter: 'module=custom-module-item' },
				);
				return (response as IDataObject[]).map((item: IDataObject) => ({
					name: `${item.name} (ID: ${item.id})`,
					value: item.id as number,
				}));
			},

			// RPC: listCustomFields — dynamic custom field specs for a space
			async getCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const spaceId = this.getCurrentNodeParameter('spaceId') as number | undefined;
				const qs: IDataObject = {};
				if (spaceId) {
					qs.spaces = spaceId;
				}
				const response = await boostspaceApiRequest.call(this, 'GET', '/api/custom-field/by-space', {}, qs);
				return (response as IDataObject[])
					.filter((item: IDataObject) => item.protected === false)
					.map((item: IDataObject) => ({
						name: `${item.description || item.name} (${mapFieldType(item.inputType as string)})`,
						value: String(item.name),
					}));
			},

			// RPC: listCustomModuleItems — records dropdown
			async getRecords(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await boostspaceApiRequest.call(this, 'GET', '/api/custom-module-item');
				return (response as IDataObject[]).map((item: IDataObject) => ({
					name: `Record ${item.id}`,
					value: item.id as number,
				}));
			},

			// RPC: listCustomModuleItemsOfSpace — records filtered by space
			async getRecordsOfSpace(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const spaceId = this.getCurrentNodeParameter('spaceId') as number | undefined;
				const qs: IDataObject = {};
				if (spaceId) {
					qs.filter = `spaceId=${spaceId}`;
				}
				const response = await boostspaceApiRequest.call(this, 'GET', '/api/custom-module-item', {}, qs);
				return (response as IDataObject[]).map((item: IDataObject) => ({
					name: `Record ${item.id}`,
					value: item.id as number,
				}));
			},

			// RPC: listCustomTypes — custom types by category
			async getCustomTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await boostspaceApiRequest.call(this, 'GET', '/api/custom-type');
				return (response as IDataObject[]).map((item: IDataObject) => ({
					name: `${item.name} (ID: ${item.id})`,
					value: item.id as number,
				}));
			},

			// RPC: listSpacesOfCustomModule — spaces filtered by custom module
			async getSpacesOfCustomModule(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const customModuleId = this.getCurrentNodeParameter('customModuleId') as number | undefined;
				const qs: IDataObject = { modul: 'custom-module-item' };
				if (customModuleId) {
					qs.filter = `customModuleId=${customModuleId}`;
				}
				const response = await boostspaceApiRequest.call(this, 'GET', '/api/space', {}, qs);
				return (response as IDataObject[]).map((item: IDataObject) => ({
					name: `${item.name} (ID: ${item.id})`,
					value: item.id as number,
				}));
			},

			// RPC: listSpacesOfCustomField — spaces filtered for a custom field
			async getSpacesOfCustomField(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const customModuleId = this.getCurrentNodeParameter('customModuleId') as number | undefined;
				const qs: IDataObject = { modul: 'custom-module-item' };
				if (customModuleId) {
					qs.filter = `customModuleId=${customModuleId}`;
				}
				const response = await boostspaceApiRequest.call(this, 'GET', '/api/space', {}, qs);
				return (response as IDataObject[]).map((item: IDataObject) => ({
					name: `${item.name} (${item.id})`,
					value: item.id as number,
				}));
			},

			// RPC: listLabelsOf — labels of a specific entity
			async getLabelsOf(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const entityId = this.getCurrentNodeParameter('customModuleItemId') as number | undefined;
				if (!entityId) return [];
				const response = await boostspaceApiRequest.call(
					this, 'GET', `/api/custom-module-item/${entityId}/label`,
				);
				return (response as IDataObject[]).map((item: IDataObject) => ({
					name: String(item.name),
					value: item.id as number,
				}));
			},

			// RPC: listConnectibleLabels — labels that can be connected to an entity
			async getConnectibleLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const entityId = this.getCurrentNodeParameter('customModuleItemId') as number | undefined;
				if (!entityId) return [];
				const response = await boostspaceApiRequest.call(
					this, 'GET', `/api/custom-module-item/${entityId}/label/connectible`,
				);
				return (response as IDataObject[]).map((item: IDataObject) => ({
					name: String(item.name),
					value: item.id as number,
				}));
			},

			// RPC: listCustomFieldsOfEntity — custom fields of a specific entity
			async getCustomFieldsOfEntity(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const entityId = this.getCurrentNodeParameter('customModuleItemId') as number | undefined;
				if (!entityId) return [];
				const response = await boostspaceApiRequest.call(
					this, 'GET', `/api/custom-field/of/custom-module-item/${entityId}`,
				);
				return (response as IDataObject[])
					.filter((item: IDataObject) => item.protected === false)
					.map((item: IDataObject) => ({
						name: `${item.description || item.name} (${mapFieldType(item.inputType as string)})`,
						value: String(item.id),
					}));
			},

			// RPC: subListLabelOfCustomModule — nested sub-labels of a module
			async getSubLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const customModuleId = this.getCurrentNodeParameter('customModuleId') as number | undefined;
				if (!customModuleId) return [];
				const response = await boostspaceApiRequest.call(
					this, 'GET', `/api/custom-module/${customModuleId}/label`,
				);
				return (response as IDataObject[]).map((item: IDataObject) => ({
					name: String(item.name),
					value: item.id as number,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[];

				// ==================== RECORD ====================
				if (resource === 'record') {
					if (operation === 'create') {
						const customModuleId = this.getNodeParameter('customModuleId', i) as number;
						const spaceId = this.getNodeParameter('spaceId', i) as number;
						const statusSystemId = this.getNodeParameter('statusSystemId', i) as number;
						const customFieldsRaw = this.getNodeParameter('customFieldsValues', i) as IDataObject;
						const labels = this.getNodeParameter('labels', i, []) as number[];
						const customFields = parseCustomFieldsInput(customFieldsRaw);

						const body: IDataObject = {
							spaceId,
							statusSystemId,
							customFieldsValues: customFieldsToApiFormat(customFields),
						};
						if (labels.length > 0) {
							body.labels = labels;
						}

						const result = await boostspaceApiRequest.call(
							this, 'POST', `/api/custom-module-item?customModuleId=${customModuleId}`, body,
						);
						responseData = flattenCustomFields(result as IDataObject);

					} else if (operation === 'createBulk') {
						const customModuleId = this.getNodeParameter('customModuleId', i) as number;
						const spaceId = this.getNodeParameter('spaceId', i) as number;
						const recordsJson = this.getNodeParameter('records', i) as string;
						const records = JSON.parse(recordsJson) as IDataObject[];
						const formattedRecords = formatBulkRecords(records, spaceId);

						const result = await boostspaceApiRequest.call(
							this, 'POST', `/api/custom-module-item?customModuleId=${customModuleId}`, formattedRecords as unknown as IDataObject,
						);
						responseData = processBulkResponse(result as IDataObject | IDataObject[]);

					} else if (operation === 'get') {
						const recordId = this.getNodeParameter('customModuleItemId', i) as number;
						const result = await boostspaceApiRequest.call(
							this, 'GET', `/api/custom-module-item/${recordId}`,
						);
						responseData = flattenCustomFields(result as IDataObject);

					} else if (operation === 'getByRemoteId') {
						const remoteId = this.getNodeParameter('remoteId', i) as string;
						const remoteApp = this.getNodeParameter('remoteApplication', i) as string;
						try {
							const result = await boostspaceApiRequest.call(
								this, 'GET', `/api/custom-module-item/remote/${encodeURIComponent(remoteId)}/${encodeURIComponent(remoteApp)}`,
							);
							if (Array.isArray(result)) {
								responseData = (result as IDataObject[]).map(flattenCustomFields);
							} else {
								responseData = flattenCustomFields(result as IDataObject);
							}
						} catch (error) {
							const err = error as any;
							if (err.httpCode === '404' || err.message?.includes('404') || err.description?.includes('not found')) {
								responseData = { found: false, remoteId, remoteApplication: remoteApp, message: `Record not found for remote ID '${remoteId}' in application '${remoteApp}'` };
							} else {
								throw error;
							}
						}

					} else if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const qs: IDataObject = {};
						const filterStr = buildFilterString(filters);
						if (filterStr) {
							qs.filter = filterStr;
						}
						const result = await boostspaceApiRequest.call(
							this, 'GET', '/api/custom-module-item', {}, qs,
						);
						if (Array.isArray(result)) {
							responseData = (result as IDataObject[]).map(flattenCustomFields);
						} else {
							responseData = result as IDataObject;
						}

					} else if (operation === 'update') {
						const customModuleId = this.getNodeParameter('customModuleId', i) as number;
						const recordId = this.getNodeParameter('customModuleItemId', i) as number;
						const customFieldsRaw = this.getNodeParameter('customFieldsValues', i) as IDataObject;
						const customFields = parseCustomFieldsInput(customFieldsRaw);

						const body: IDataObject = {};
						if (Object.keys(customFields).length > 0) {
							body.customFieldsValues = customFieldsToApiFormat(customFields);
						}

						// System fields (directly visible in the UI)
						const updateSpaceId = this.getNodeParameter('updateSpaceId', i, '') as string | number;
						const updateStatusSystemId = this.getNodeParameter('updateStatusSystemId', i, '') as string | number;
						const updateStatusId = this.getNodeParameter('updateStatusId', i, 0) as number;
						const updateLabels = this.getNodeParameter('updateLabels', i, []) as number[];

						if (updateSpaceId) body.spaceId = updateSpaceId;
						if (updateStatusSystemId) body.statusSystemId = updateStatusSystemId;
						if (updateStatusId) body.statusId = updateStatusId;
						if (updateLabels.length > 0) body.labels = updateLabels;

						if (Object.keys(body).length === 0) {
							throw new NodeOperationError(
								this.getNode(),
								'At least one field must be provided to update the record. Set a custom field, Space, Status System, Status ID, or Labels.',
								{ itemIndex: i },
							);
						}

						const result = await boostspaceApiRequest.call(
							this, 'PUT', `/api/custom-module-item/${recordId}?customModuleId=${customModuleId}`, body,
						);
						responseData = flattenCustomFields(result as IDataObject);

					} else if (operation === 'delete') {
						const recordId = this.getNodeParameter('customModuleItemId', i) as number;
						await boostspaceApiRequest.call(
							this, 'DELETE', `/api/custom-module-item/${recordId}`,
						);
						responseData = { success: true };

					} else if (operation === 'sync') {
						const remoteId = this.getNodeParameter('remoteId', i) as string;
						const remoteApp = this.getNodeParameter('remoteApplication', i) as string;
						const spaceId = this.getNodeParameter('spaceId', i) as number;
						const statusSystemId = this.getNodeParameter('statusSystemId', i) as number;
						const customFieldsRaw = this.getNodeParameter('customFieldsValues', i) as IDataObject;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const customFields = parseCustomFieldsInput(customFieldsRaw);

						const body: IDataObject = {
							spaceId,
							statusSystemId,
							customFieldsValues: customFieldsToApiFormat(customFields),
						};
						if (additionalFields.statusId) body.statusId = additionalFields.statusId;
						if (additionalFields.labels) body.labels = additionalFields.labels;

						const result = await boostspaceApiRequest.call(
							this, 'POST', `/api/custom-module-item/remote/${encodeURIComponent(remoteId)}/${encodeURIComponent(remoteApp)}`, body,
						);
						responseData = flattenCustomFields(result as IDataObject);

					} else {
						throw new Error(`Unsupported operation: ${operation}`);
					}

				// ==================== SPACE ====================
				} else if (resource === 'space') {
					if (operation === 'create') {
						const customModuleId = this.getNodeParameter('customModuleId', i) as number;
						const name = this.getNodeParameter('name', i) as string;
						const body: IDataObject = {
							name,
							module: 'custom-module-item',
							customModuleId,
						};
						responseData = await boostspaceApiRequest.call(
							this, 'POST', '/api/space', body,
						) as IDataObject;

					} else if (operation === 'get') {
						const spaceId = this.getNodeParameter('spaceId', i) as number;
						responseData = await boostspaceApiRequest.call(
							this, 'GET', `/api/space/${spaceId}`,
						) as IDataObject;

					} else if (operation === 'getMany') {
						const result = await boostspaceApiRequest.call(
							this, 'GET', '/api/space',
						);
						responseData = Array.isArray(result) ? result as IDataObject[] : result as IDataObject;

					} else if (operation === 'update') {
						const spaceId = this.getNodeParameter('spaceId', i) as number;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = { id: spaceId, ...updateFields };
						responseData = await boostspaceApiRequest.call(
							this, 'PUT', `/api/space/${spaceId}`, body,
						) as IDataObject;

					} else if (operation === 'delete') {
						const spaceId = this.getNodeParameter('spaceId', i) as number;
						await boostspaceApiRequest.call(this, 'DELETE', `/api/space/${spaceId}`);
						responseData = { success: true };

					} else {
						throw new Error(`Unsupported operation: ${operation}`);
					}

				// ==================== CUSTOM MODULE ====================
				} else if (resource === 'customModule') {
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IDataObject = { name, ...additionalFields };
						responseData = await boostspaceApiRequest.call(
							this, 'POST', '/api/custom-module', body,
						) as IDataObject;

					} else if (operation === 'get') {
						const moduleId = this.getNodeParameter('customModuleId', i) as number;
						responseData = await boostspaceApiRequest.call(
							this, 'GET', `/api/custom-module/${moduleId}`,
						) as IDataObject;

					} else if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const qs: IDataObject = {};
						if (filters.limit) qs.limit = filters.limit;
						if (filters.offset) qs.offset = filters.offset;
						const result = await boostspaceApiRequest.call(
							this, 'GET', '/api/custom-module', {}, qs,
						);
						responseData = Array.isArray(result) ? result as IDataObject[] : result as IDataObject;

					} else if (operation === 'update') {
						const moduleId = this.getNodeParameter('customModuleId', i) as number;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						responseData = await boostspaceApiRequest.call(
							this, 'PUT', `/api/custom-module/${moduleId}`, updateFields,
						) as IDataObject;

					} else if (operation === 'delete') {
						const moduleId = this.getNodeParameter('customModuleId', i) as number;
						await boostspaceApiRequest.call(this, 'DELETE', `/api/custom-module/${moduleId}`);
						responseData = { success: true };

					} else {
						throw new Error(`Unsupported operation: ${operation}`);
					}

				// ==================== FIELD ====================
				} else if (resource === 'field') {
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const inputType = this.getNodeParameter('inputType', i) as string;
						const elementGroupId = this.getNodeParameter('elementGroupId', i);
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IDataObject = {
							name,
							tooltip: additionalFields.tooltip || '',
							inputType,
							description: additionalFields.description || '',
							elementGroups: [String(elementGroupId)],
						};
						responseData = await boostspaceApiRequest.call(
							this, 'POST', '/api/custom-field/input', body,
						) as IDataObject;

					} else if (operation === 'get') {
						const fieldId = this.getNodeParameter('customFieldId', i) as number;
						responseData = await boostspaceApiRequest.call(
							this, 'GET', `/api/custom-field/input/${fieldId}`,
						) as IDataObject;

					} else if (operation === 'getMany') {
						const spaceIdRaw = this.getNodeParameter('spaceId', i) as string | number;
						const spaceId = Number(spaceIdRaw);
						if (!spaceIdRaw || Number.isNaN(spaceId)) {
							throw new NodeOperationError(
								this.getNode(),
								`Invalid Space: "${spaceIdRaw}". Pick a space from the dropdown or provide a numeric space ID via an expression.`,
								{ itemIndex: i },
							);
						}
						const result = await boostspaceApiRequest.call(
							this, 'GET', `/api/custom-field/by-space/${spaceId}`,
						);
						if (Array.isArray(result) && result.length === 0) {
							responseData = { message: `No fields found for space ${spaceId}. The space may not exist or has no custom fields.` };
						} else {
							responseData = Array.isArray(result) ? result as IDataObject[] : result as IDataObject;
						}

					} else if (operation === 'update') {
						const fieldId = this.getNodeParameter('customFieldInputId', i) as number;
						const elementGroupId = this.getNodeParameter('elementGroupId', i);
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						// Fetch current field to fill in all required fields (API requires full body)
						const current = await boostspaceApiRequest.call(
							this, 'GET', `/api/custom-field/input/${fieldId}`,
						) as IDataObject;

						const body: IDataObject = {
							name: (updateFields.name as string) || (current.name as string) || '',
							tooltip: updateFields.tooltip !== undefined ? (updateFields.tooltip as string) : (current.tooltip as string) || '',
							inputType: (updateFields.inputType as string) || (current.inputType as string) || '',
							description: updateFields.description !== undefined ? (updateFields.description as string) : (current.description as string) || '',
							elementGroups: [String(elementGroupId)],
							_method: 'PUT',
						};
						responseData = await boostspaceApiRequest.call(
							this, 'POST', `/api/custom-field/input/${fieldId}`, body,
						) as IDataObject;

					} else if (operation === 'delete') {
						const fieldId = this.getNodeParameter('customFieldId', i) as number;
						await boostspaceApiRequest.call(this, 'DELETE', `/api/custom-field/input/${fieldId}`);
						responseData = { success: true };

					} else {
						throw new Error(`Unsupported operation: ${operation}`);
					}

				// ==================== API CALL ====================
				} else if (resource === 'apiCall') {
					const method = this.getNodeParameter('method', i) as IHttpRequestMethods;
					const url = this.getNodeParameter('url', i) as string;
					const headersData = this.getNodeParameter('headers', i) as IDataObject;
					const queryData = this.getNodeParameter('queryString', i) as IDataObject;

					const qs: IDataObject = {};
					const headerEntries = (headersData.header as IDataObject[]) ?? [];
					for (const entry of headerEntries) {
						// Custom headers are handled separately
					}

					const qsEntries = (queryData.parameter as IDataObject[]) ?? [];
					for (const entry of qsEntries) {
						if (entry.key) {
							qs[entry.key as string] = entry.value;
						}
					}

					let body: IDataObject = {};
					if (['POST', 'PUT', 'PATCH'].includes(method)) {
						const bodyJson = this.getNodeParameter('body', i, '{}') as string;
						body = JSON.parse(bodyJson) as IDataObject;
					}

					const result = await boostspaceApiRequest.call(
						this, method, `/api/${url}`, body, qs,
					);
					responseData = {
						body: result,
						statusCode: 200,
					};

				} else {
					throw new Error(`Unsupported resource: ${resource}`);
				}

				// Return data
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject | IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
