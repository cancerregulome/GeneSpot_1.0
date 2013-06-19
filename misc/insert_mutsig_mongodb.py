import argparse
import csv
import json
import os
import pymongo
import sys


def iterate_genes_cv_format(file_path, cancer):
    with open(file_path, 'rb') as csvfile:
        print('Processing ' + file_path)

        csvreader = csv.DictReader(csvfile, delimiter='\t')
        count = 0

        for row in csvreader:
            # Convert integer fields
            for key in ['Nnon', 'Nsil', 'Nflank', 'nnon', 'npat', 'nsite', 'nsil', 'nflank', 'nnei']:
                row[key] = int(row[key])

            row['cancer'] = cancer.upper()
            row['gene'] = row['gene'].lower()

            yield row
            count += 1

        info = '{0:10} rows processed'.format(count)
        print('   ' + info)


def validate_import_config(config):
    required_fields = frozenset(['label', 'description', 'collection', 'data'])

    for field in required_fields:
        if field not in config:
            raise Exception("Required field '" + field + "' is missing from configuration")

    data = config['data']

    if "base_path" not in data:
        raise Exception("Required field 'base_path' is missing from 'data' configuration")
    if "files" not in data:
        raise Exception("Required field 'files' is missing from 'data' configuration")

    data_files = config['data']['files']
    for file_desc in data_files:
        # The file has to exist
        file_path = os.path.join(data['base_path'], file_desc['path'])
        if not os.path.isfile(file_path):
            raise Exception("Data file does not exist: " + file_path)
        # The 'cancer' field has to exist
        if 'cancer' not in file_desc:
            raise Exception("Required field 'cancer' is missing for file '" + file_path + "'")


def add_to_provenance(provenance, data_source):
    provenance['items'].append({
        "cancer": data_source['cancer'],
        "source": data_source['path']
    })


def load_config_json(file_path):
    json_file = open(file_path, 'rb')
    data = json.load(json_file)
    json_file.close()
    return data


def connect_database(hostname, port):
    connection = pymongo.Connection(hostname, port)
    return connection


def main():
    parser = argparse.ArgumentParser(description="MutSig to MongoDB import utility")
    parser.add_argument('--host', required=True, type=str, help='Hostname')
    parser.add_argument('--port', required=True, type=int, help='Port')
    parser.add_argument('--db', required=True, type=str, help='Database name')
    parser.add_argument('--import-config', required=True, help='Import configuration JSON-file')
    parser.add_argument('--dry-run', required=False, action='store_true', help='If enabled, no transactions are done to the database')
    parser.add_argument('--provenance', required=False, type=str, help='Path to provenance output file')

    args = parser.parse_args()

    # Read in the config file
    try:
        import_config = load_config_json(args.import_config)
        validate_import_config(import_config)
    except Exception as e:
        print('Error while reading import configuration JSON: ' + str(e))
        print('Quitting...')
        sys.exit(1)

    # Try open connection first, exit in case of failure
    conn = None
    try:
        conn = connect_database(args.host, args.port)
    except pymongo.errors.ConnectionFailure:
        print("Failed to connect to database at " + args.host + ":" + str(args.port))
        sys.exit(1)

    collection = conn[args.db][import_config['collection']]

    provenance = {
        "items": []
    }

    data = import_config['data']
    base_path = data['base_path']

    for file_info in data['files']:
        file_format = file_info['format']
        file_path = os.path.join(base_path, file_info['path'])

        if file_format == 'cv':
            for mutsig_dict in iterate_genes_cv_format(file_path, file_info['cancer']):
                if args.dry_run is False:
                    collection.insert(mutsig_dict)

            add_to_provenance(provenance, file_info)
        else:
            print("Unknown format '" + file_format + "' for file '" + file_path + "', skipping ...")

    conn.close()

    if 'provenance' in args:
        prov_json = json.dumps(provenance, sort_keys=True, indent=4)
        with open(args.provenance, 'wb') as provenance_file_out:
            provenance_file_out.write(prov_json)


if __name__ == "__main__":
    main()
