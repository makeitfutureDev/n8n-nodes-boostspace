import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	boostspaceApiRequest,
	flattenCustomFields,
	getWebhookConfig,
} from './GenericFunctions';

export class BoostspaceTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Boost.space Trigger',
		name: 'boostspaceTrigger',
		icon: 'file:boostspace.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["eventType"]}}',
		description: 'Starts the workflow when a Boost.space event occurs',
		defaults: { name: 'Boost.space Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{ name: 'boostspaceApi', required: true },
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event Type',
				name: 'eventType',
				type: 'options',
				required: true,
				default: 'recordCreated',
				options: [
					{ name: 'Module Created', value: 'moduleCreated' },
					{ name: 'Module Created, Updated or Deleted', value: 'moduleCud' },
					{ name: 'Module Deleted', value: 'moduleDeleted' },
					{ name: 'Module Updated', value: 'moduleUpdated' },
					{ name: 'Record Created', value: 'recordCreated' },
					{ name: 'Record Created, Updated or Deleted', value: 'recordCud' },
					{ name: 'Record Deleted', value: 'recordDeleted' },
					{ name: 'Record Updated', value: 'recordUpdated' },
				],
				description: 'The event type to listen for',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				return !!webhookData.externalHookId;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const eventType = this.getNodeParameter('eventType') as string;
				const { module, events } = getWebhookConfig(eventType);

				// Step 1: Register the action (webhook endpoint)
				const actionBody: IDataObject = {
					type: 'url',
					title: `n8n - ${eventType} action`,
					setting: {
						url: webhookUrl,
						data: '{json_encode($entity)|noescape}',
						method: 'POST',
						headers: ['Content-type: application/json'],
					},
				};
				const actionResponse = await boostspaceApiRequest.call(
					this, 'POST', '/api/automatization/action', actionBody,
				) as IDataObject;
				const actionId = actionResponse.id;

				// Step 2: Create trigger rule(s) for each event
				for (const event of events) {
					await boostspaceApiRequest.call(
						this, 'POST', '/api/automatization/trigger', {
							event,
							title: `n8n - ${module} ${event} rule`,
							module,
							actions: [actionId],
						},
					);
				}

				// Store the action ID for cleanup
				const webhookData = this.getWorkflowStaticData('node');
				webhookData.externalHookId = actionId;

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const actionId = webhookData.externalHookId;
				if (actionId) {
					try {
						await boostspaceApiRequest.call(
							this, 'DELETE', `/api/automatization/action/${actionId}`,
						);
					} catch (error) {
						this.logger.error('Boost.space: failed to delete webhook action', { error });
						return false;
					}
					delete webhookData.externalHookId;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as IDataObject;
		const headerData = this.getHeaderData() as IDataObject;

		// Merge x-trigger-event header into body (from mergeBodyAndHeaderEvent)
		const triggerEvent = headerData['x-trigger-event'] as string;
		if (triggerEvent) {
			bodyData['x-trigger-event'] = triggerEvent;
		}

		// Flatten custom fields if present
		const processed = flattenCustomFields(bodyData);

		return {
			workflowData: [this.helpers.returnJsonArray(processed)],
		};
	}
}
