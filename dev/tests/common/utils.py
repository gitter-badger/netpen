# pylint: disable=redefined-outer-name
import os
import shutil
import glob
import tempfile
import subprocess
import yaml
import pytest
from netpen.topology import Topology


EXAMPLES_DIR = './examples'
EXAMPLES_GLOB = f'{EXAMPLES_DIR}/*.yml'
EXAMPLES_LIST = f'{EXAMPLES_DIR}/example_list.yml'
EXAMPLES_OUTPUT_DIR = '/tmp/examples'


def netpen_yaml_to_bash(input_yaml, fname):
    output_file = f'{EXAMPLES_OUTPUT_DIR}/{shellfile(fname)}'
    t = Topology()

    t.load(input_yaml)

    with open(output_file, 'w') as f:
        t.printfn = lambda s: f.write(f'{s}\n')
        t.render_bash()
    os.chmod(output_file, 0o777)
    return output_file


def netpen_bash(input_file, fname):
    with open(input_file) as f:
        y = yaml.safe_load(f)

    return netpen_yaml_to_bash(y, fname)


def all_example_file_names():
    all_examples = glob.glob(EXAMPLES_GLOB)
    all_examples.remove(EXAMPLES_LIST)
    return [os.path.basename(e) for e in all_examples]


def shellfile(fname):
    base = os.path.splitext(fname)[0]
    return f'{base}.sh'


ALL_EXAMPLE_FILE_NAMES = all_example_file_names()
ALL_EXAMPLE_FILES = [f'{EXAMPLES_OUTPUT_DIR}/{shellfile(f)}'
                     for f in ALL_EXAMPLE_FILE_NAMES]


@pytest.fixture(scope='session')
def examples_output_dir():
    os.makedirs(EXAMPLES_OUTPUT_DIR)
    try:
        yield EXAMPLES_OUTPUT_DIR
    finally:
        shutil.rmtree(EXAMPLES_OUTPUT_DIR)


@pytest.fixture(scope='session', autouse=True)
def gen_examples(examples_output_dir):  # pylint: disable=unused-argument
    ret = []
    for f in ALL_EXAMPLE_FILE_NAMES:
        input_file = f'{EXAMPLES_DIR}/{f}'
        output_file = netpen_bash(input_file, f)
        ret.append(output_file)
    return ret


def deploy_yaml(yaml_txt):
    t = Topology()
    y = yaml.safe_load(yaml_txt)
    t.load(y)

    fn = None
    with tempfile.NamedTemporaryFile(mode='w', delete=False) as outfile:
        t.printfn = lambda s: outfile.write(f'{s}\n')
        t.render_bash()
        fn = outfile.name

    os.chmod(fn, 0o777)
    subprocess.run(['sudo', fn], check=True)
    os.remove(fn)
