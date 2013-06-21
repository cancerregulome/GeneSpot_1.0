from tornado.options import options, logging, define
from tornado.escape import url_unescape
import tornado.web

import csv
import json
import os
import subprocess
from tempfile import NamedTemporaryFile
import urllib
import urlparse

server_settings = {
    "xheaders" : True,
    "address" : "0.0.0.0"
}

settings = {
    "debug": True
}

def parseNodes(filepath):
    INFO_FIELDS = frozenset(['id', 'type', '_yloc', 'p-value', 'info', 'link'])

    if not os.path.isfile(filepath):
        return

    dictreader = csv.DictReader(open(filepath, "rb"),   delimiter='\t')

    data_fields = [x for x in dictreader.fieldnames if x not in INFO_FIELDS]
    data_rows = []

    for row in dictreader:
        dr = {"id": row['id'],
              "type": row['type'],
              "_yloc": row['_yloc'],
              "p-value": row['p-value'],
              "info": row['info'],
              "link": row['link'],
              "values": [(lambda x: float(row[x]))(df) for df in data_fields]}

        if '_yloc' in row:
            dr['y'] = row['_yloc']

        data_rows.append(dr)

    result = {"ids": data_fields,
              "rows": data_rows}

    return result


def parseEdges(filepath):
    if not os.path.isfile(filepath):
        return

    dictreader = csv.DictReader(open(filepath, "rb"), delimiter='\t')

    data_rows = []

    for row in dictreader:
        dr = {"src": row['source'],
              "trg": row['target']}

        data_rows.append(dr)

    result = {"rows": data_rows}

    return result


def parseAnnotations(filepath):
    json_file = open(filepath, 'rb')
    data = json.load(json_file)
    json_file.close()
    return data


def parseHeatmap(filepath, id_column):
    info_fields = set([id_column])

    if not os.path.isfile(filepath):
        return

    dictreader = csv.DictReader(open(filepath, "rb"), delimiter='\t')

    data_fields = [x for x in dictreader.fieldnames if x not in info_fields]
    data_rows = []

    for row in dictreader:
        dr = {"id": row[id_column],
              "values": [(lambda x: float(row[x]))(df) for df in data_fields]}

        data_rows.append(dr)

    result = {"ids": data_fields,
              "rows": data_rows}

    return result


class ML2Analysis(tornado.web.RequestHandler):
    def validateQuery(self, params):
        result = dict()

        try:
            # The cutoff values have be a floats
            gene_cutoff = float(params['gene_cutoff'])
            pathway_cutoff = float(params['pathway_cutoff'])
            hallmark_cutoff = float(params['hallmark_cutoff'])

            if 'groups' not in params:
                raise Exception("Invalid parameters", params)

        except Exception as e:
            raise Exception("Invalid parameters", params)

    def createInputFile(self, params, outfile):
        # Groups
        for group in params['groups']:
            row_data = ['GROUP', group['id']]
            row_data.extend(group['samples'])

            outfile.write('\t'.join(row_data) + '\n')

        # Cutoff value
        outfile.write('\t'.join(['GENE_CUTOFF', str(params['gene_cutoff'])]) + '\n')

        # Cutoff value
        outfile.write('\t'.join(['PATHWAY_CUTOFF', str(params['pathway_cutoff'])]) + '\n')

        # Cutoff value
        outfile.write('\t'.join(['HALLMARK_CUTOFF', str(params['hallmark_cutoff'])]) + '\n')

        # Genes - optional
        if 'genes' in params:
            gene_row = ['GENES']
            gene_row.extend(params['genes'])
            outfile.write('\t'.join(gene_row) + '\n')

        # Pathways - optional
        if 'pathways' in params:
            pathway_row = ['PATHWAYS']
            pathway_row.extend(params['pathways'])
            outfile.write('\t'.join(pathway_row) + '\n')

        # Hallmarks - optional
        if 'hallmarks' in params:
            hallmark_row = ['HALLMARKS']
            hallmark_row.extend(params['hallmarks'])
            outfile.write('\t'.join(hallmark_row) + '\n')


    def runAnalysis(self, matlab_exe, script_path, input_params, result_obj):
        # Create needed temporary files.
        input_file = NamedTemporaryFile(mode="w+t", delete=False)
        input_path = input_file.name
        logging.debug("Temp input file= %s" % input_path)

        # For the output files the file handles have to be closed so
        # that the external process can open the files and write to them.
        edges_out_file = NamedTemporaryFile(delete=False)
        edges_out_path = edges_out_file.name
        edges_out_file.close()
        logging.debug("Temp edges file= %s" % edges_out_path)

        nodes_out_file = NamedTemporaryFile(delete=False)
        nodes_out_path = nodes_out_file.name
        nodes_out_file.close()
        logging.debug("Temp nodes file= %s" % nodes_out_path)

        annotations_out_file = NamedTemporaryFile(delete=False)
        annotations_out_path = annotations_out_file.name
        annotations_out_file.close()
        logging.debug("Temp annotations file= %s" % annotations_out_path)

        geneheatmap_out_file = NamedTemporaryFile(delete=False)
        geneheatmap_out_path = geneheatmap_out_file.name
        geneheatmap_out_file.close()
        logging.debug("Temp gene heatmap file= %s" % geneheatmap_out_path)

        pathwayheatmap_out_file = NamedTemporaryFile(delete=False)
        pathwayheatmap_out_path = pathwayheatmap_out_file.name
        pathwayheatmap_out_file.close()
        logging.debug("Temp pathways heatmap file= %s" % pathwayheatmap_out_path)

        hallmarkheatmap_out_file = NamedTemporaryFile(delete=False)
        hallmarkheatmap_out_path = hallmarkheatmap_out_file.name
        hallmarkheatmap_out_file.close()
        logging.debug("Temp hallmarks heatmap file= %s" % hallmarkheatmap_out_path)

        # Create input file content for the Matlab script
        self.createInputFile(input_params, input_file)
        input_file.close()

        try:
            # Generate the command to be evaluated in the matlab process
            script_dir = os.path.dirname(script_path)
            script_file = os.path.basename(script_path)
            matlab_function = script_file.rsplit('.m')[0]

            # The Matlab function takes a path to a .mat-file as the first parameter.
            preset_input_path = os.path.join(script_dir, options.ml2_data)

            # Quote all parameters
            matlab_function_parameters = []
            for p in [preset_input_path,
                      input_path,
                      nodes_out_path,
                      edges_out_path,
                      annotations_out_path,
                      geneheatmap_out_path,
                      pathwayheatmap_out_path,
                      hallmarkheatmap_out_path]:
                matlab_function_parameters.append("'" + p + "'")

            matlab_cmd = ['cd(\'' + script_dir + '\')']
            matlab_cmd.append(matlab_function + '(' + ','.join(matlab_function_parameters) + ')')

            cmdline = [matlab_exe, '-nosplash', '-nodisplay', '-r', '; '.join(matlab_cmd)]
            retval = subprocess.call(cmdline, shell=False)

            result_obj["edges"] = parseEdges(edges_out_path)
            result_obj["nodes"] = parseNodes(nodes_out_path)
            result_obj["annotations"] = parseAnnotations(annotations_out_path)
            result_obj["geneheatmap"] = parseHeatmap(geneheatmap_out_path, 'geneheatmap')
            result_obj["pathwayheatmap"] = parseHeatmap(pathwayheatmap_out_path, 'pathwayheatmap')
            result_obj["hallmarkheatmap"] = parseHeatmap(hallmarkheatmap_out_path, 'hallmarkheatmap')

        finally:
            # Remove the temporary files
            os.unlink(input_path)
            os.unlink(edges_out_path)
            os.unlink(nodes_out_path)
            os.unlink(annotations_out_path)
            os.unlink(geneheatmap_out_path)
            os.unlink(pathwayheatmap_out_path)
            os.unlink(hallmarkheatmap_out_path)


    def post(self):
        if 'verbose' in options:
            logging.info("[%s] [%s]" % (self.request.uri, self.request.arguments))

        cleanquery = urllib.unquote_plus(self.request.body).strip()

        params = urlparse.parse_qs(cleanquery)
        query = json.loads(params['query'][0])
        self.validateQuery(query)

        logging.debug(json.dumps(query, sort_keys=True, indent=4))

        # Run the analysis script in a Matlab process
        result_obj = {}
        self.runAnalysis(options.matlab_executable, options.ml2_script, query, result_obj)

        self.write(json.dumps(result_obj))
        self.set_status(200)


def standalone_test():
    EDGES_PATH = './edges.tsv'
    NODES_PATH = './nodes.tsv'
    ANNOTATIONS_PATH = './annotations.json'

    obj = {"edges": parseEdges(EDGES_PATH),
           "nodes": parseNodes(NODES_PATH, nodes),
           "annotations": parseAnnotations(ANNOTATIONS_PATH)}

    print(json.dumps(obj, sort_keys=True, indent=4))


def main():
    define("port", default=8321, help="run on the given port", type=int)
    define("verbose", default=False, help="Prints debugging statements")
    define("matlab_executable", default=".", help="Path to Matlab executable")
    define("ml2_script", default=".", help="Path to ML2 analysis script")
    define("ml2_data", default=".", help="Path to ML2 support data file (.mat)")

    tornado.options.parse_command_line()

    logging.info("Starting Tornado web server on http://localhost:%s" % options.port)
    logging.info("--matlab_executable=%s" % options.matlab_executable)
    logging.info("--ml2_script=%s" % options.ml2_script)
    logging.info("--ml2_data=%s" % options.ml2_data)
    logging.info("--verbose=%s" % options.verbose)

    application = tornado.web.Application([
        (r"/", ML2Analysis),
        (r"/svc/ML2", ML2Analysis),
    ], **settings)
    application.listen(options.port, **server_settings)
    tornado.ioloop.IOLoop.instance().start()


if __name__ == "__main__":
    main()
