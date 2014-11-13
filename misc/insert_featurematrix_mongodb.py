import argparse
import csv
import json
import os
import pymongo
import sys


def feature_id_extract(feature):
    feature_parts = feature.split(":")
    source = feature_parts[1].lower()

    if "chr" in feature_parts[3]:
        start = feature_parts[4]
        end = feature_parts[5]
        if not start:
            start = -1
        if not end:
            end = -1

        return {
            "id": feature,
            "type": feature_parts[0],
            "source": source,
            "gene": feature_parts[2].lower(),
            "label": feature_parts[2],
            "chr": feature_parts[3][3:],
            "start": int(start),
            "end": int(end),
            "strand": feature_parts[6],
            "modifier": feature_parts[7]
        }

    return {
        "id": feature,
        "type": feature_parts[0],
        "source": source,
        "label": feature_parts[2],
        "modifier": feature_parts[7]
    }


def build_value_dict_categorical(ids, values):
    result = {}
    for i, v in zip(ids, values):
            result[i] = v

    return result


def build_value_dict_numerical(ids, values):
    result = {}
    for i, v in zip(ids, values):
        if v == 'NA':
            result[i] = v
        else:
            result[i] = float(v)

    return result


def iterate_features(descriptor):
    file_path = descriptor['path']
    with open(file_path, 'rb') as csvfile:
        csvreader = csv.reader(csvfile, delimiter='\t')

        ids = csvreader.next()[1:]

        print('Processing ' + file_path)

        count = 0
        skipped = 0

        for row in csvreader:
            feature_id = row[0]
            values = row[1:]

            if len(values) != len(ids):
                print('   Skipping feature (' + len(values) + '/' + len(ids) + ')' + feature_id)
                skipped += 1
                continue

            feature_object = feature_id_extract(feature_id)
            feature_object['cancer'] = descriptor['cancer'].upper()

            if feature_object['type'] == 'N':
                feature_object['values'] = build_value_dict_numerical(ids, values)
            else:
                feature_object['values'] = build_value_dict_categorical(ids, values)

            count += 1

            yield feature_object

        info = '{0:10} IDs'.format(len(ids))
        info += ' {0:10} features'.format(count)
        info += ' {0:10} skipped'.format(skipped)
        print('   ' + info)


def validate_import_config(config):
    required_fields = frozenset(['label', 'description', 'collection', 'files'])

    for field in required_fields:
        if field not in config:
            raise Exception("Required field '" + field + "' is missing")

    for file_desc in config['files']:
        # The file has to exist
        file_path = file_desc['path']
        if not os.path.isfile(file_path):
            raise Exception("Data file does not exist: " + file_path)
        # The 'cancer' field has to exist
        if 'cancer' not in file_desc:
            raise Exception("Required field 'cancer' is missing from file '" + file_path + "'")


def load_config_json(file_path):
    json_file = open(file_path, 'rb')
    data = json.load(json_file)
    json_file.close()
    return data


def connect_database(hostname, port):
    connection = pymongo.Connection(hostname, port)
    return connection


def main():
    parser = argparse.ArgumentParser(description="TCGA feature matrix to MongoDB import utility")
    parser.add_argument('--host', required=True, help='Hostname')
    parser.add_argument('--port', required=True, type=int, help='Port')
    parser.add_argument('--db', required=True, help='Database name')
    parser.add_argument('--import-config', required=True, help='Import configuration JSON-file')
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

    for file_info in import_config['files']:
        for feature_object in iterate_features(file_info):
            collection.insert(feature_object)

    conn.close()


if __name__ == "__main__":
    main()
