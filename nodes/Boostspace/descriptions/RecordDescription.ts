import type { INodeProperties } from 'n8n-workflow';

export const recordOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['record'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a record', description: 'Creates a new record' },
			{ name: 'Create Bulk', value: 'createBulk', action: 'Create records in bulk', description: 'Creates multiple records at once' },
			{ name: 'Delete', value: 'delete', action: 'Delete a record', description: 'Deletes a record' },
			{ name: 'Get', value: 'get', action: 'Get a record', description: 'Returns a single record by ID' },
			{ name: 'Get by Remote ID', value: 'getByRemoteId', action: 'Get a record by remote ID', description: 'Returns a record by its remote application ID' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many records', description: 'Returns a list of records' },
			{ name: 'Sync', value: 'sync', action: 'Synchronize a record', description: 'Creates or updates a record by remote ID (upsert)' },
			{ name: 'Update', value: 'update', action: 'Update a record', description: 'Updates an existing record' },
		],
		default: 'getMany',
	},
];

export const recordFields: INodeProperties[] = [
	// ------ Custom Module ID (shared across create, createBulk, update) ------
	{
		displayName: 'Custom Module Name or ID',
		name: 'customModuleId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCustomModules' },
		required: true,
		displayOptions: { show: { resource: ['record'], operation: ['create', 'createBulk', 'update'] } },
		default: '',
		description: 'The module to work with. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// ------ Space ID (for create, createBulk, sync) ------
	{
		displayName: 'Space Name or ID',
		name: 'spaceId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
			loadOptionsDependsOn: ['customModuleId'],
		},
		required: true,
		displayOptions: { show: { resource: ['record'], operation: ['create', 'createBulk', 'sync'] } },
		default: '',
		description: 'The space within the module. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// ------ Status System ID (for create, sync) ------
	{
		displayName: 'Status System Name or ID',
		name: 'statusSystemId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getStatusSystems' },
		required: true,
		displayOptions: { show: { resource: ['record'], operation: ['create', 'sync'] } },
		default: '',
		description: 'The status system for the record. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// ------ Custom Fields (for create, update, sync) ------
	{
		displayName: 'Custom Fields',
		name: 'customFieldsValues',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		displayOptions: { show: { resource: ['record'], operation: ['create', 'update', 'sync'] } },
		default: {},
		options: [
			{
				name: 'field',
				displayName: 'Field',
				values: [
					{
						displayName: 'Field Name',
						name: 'key',
						type: 'string',
						default: '',
						description: 'The name of the custom field',
					},
					{
						displayName: 'Field Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'The value of the custom field. For multi-value fields, separate values with |.',
					},
				],
			},
		],
		description: 'Custom field key-value pairs for the record',
	},

	// ------ Labels (for create) ------
	{
		displayName: 'Label Names or IDs',
		name: 'labels',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getLabels',
			loadOptionsDependsOn: ['spaceId'],
		},
		displayOptions: { show: { resource: ['record'], operation: ['create'] } },
		default: [],
		description: 'Labels to attach to the record. Labels must be attached to the space. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// ------ Record ID (for get, update, delete) ------
	{
		displayName: 'Record ID',
		name: 'customModuleItemId',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['record'], operation: ['get', 'update', 'delete'] } },
		default: 0,
		description: 'The ID of the record',
	},

	// ------ Remote ID fields (for getByRemoteId, sync) ------
	{
		displayName: 'Remote ID',
		name: 'remoteId',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['record'], operation: ['getByRemoteId', 'sync'] } },
		default: '',
		description: 'ID of the source record in the remote application',
	},
	{
		displayName: 'Remote Application',
		name: 'remoteApplication',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['record'], operation: ['getByRemoteId', 'sync'] } },
		default: '',
		description: 'Name of the source application for this remote ID (e.g. Shopify)',
	},

	// ------ System Fields for update ------
	{
		displayName: 'Space Name or ID',
		name: 'updateSpaceId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
			loadOptionsDependsOn: ['customModuleId'],
		},
		displayOptions: { show: { resource: ['record'], operation: ['update'] } },
		default: '',
		description: 'Move record to a different space. Leave empty to keep current. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Status System Name or ID',
		name: 'updateStatusSystemId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getStatusSystems' },
		displayOptions: { show: { resource: ['record'], operation: ['update'] } },
		default: '',
		description: 'Change the status system. Leave empty to keep current. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Status ID',
		name: 'updateStatusId',
		type: 'number',
		displayOptions: { show: { resource: ['record'], operation: ['update'] } },
		default: 0,
		description: 'The status ID to set on the record. Leave 0 to keep current.',
	},
	{
		displayName: 'Label Names or IDs',
		name: 'updateLabels',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getLabels',
		},
		displayOptions: { show: { resource: ['record'], operation: ['update'] } },
		default: [],
		description: 'Labels to attach to the record. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// ------ Additional Fields for sync ------
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: { show: { resource: ['record'], operation: ['sync'] } },
		default: {},
		options: [
			{
				displayName: 'Status ID',
				name: 'statusId',
				type: 'number',
				default: 0,
				description: 'The status ID to set on the record',
			},
			{
				displayName: 'Label Names or IDs',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
					loadOptionsDependsOn: ['spaceId'],
				},
				default: [],
				description: 'Label IDs. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},

	// ------ Filters for getMany ------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: { show: { resource: ['record'], operation: ['getMany'] } },
		default: {},
		options: [
			{
				displayName: 'Space Name or ID',
				name: 'spaceId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getSpaces' },
				default: '',
				description: 'Filter by space. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Custom Module Name or ID',
				name: 'customModuleId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getCustomModules' },
				default: '',
				description: 'Filter by custom module. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},

	// ------ Bulk Create: Records array ------
	{
		displayName: 'Records',
		name: 'records',
		type: 'json',
		required: true,
		displayOptions: { show: { resource: ['record'], operation: ['createBulk'] } },
		default: '[]',
		description: 'JSON array of records to create. Each record can contain customFieldsValues (object of field name to value), statusSystemId, and labels.',
	},
];
